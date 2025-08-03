// Simple LangGraph-inspired implementation for browser
export interface BaseMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface StateReducer<T> {
  (current: T, update: T): T;
}

export interface StateDefinition {
  [key: string]: {
    reducer?: StateReducer<any>;
    default: () => any;
  };
}

export interface GraphState {
  [key: string]: any;
}

export type NodeFunction<T extends GraphState> = (state: T) => Promise<Partial<T>> | Partial<T>;
export type EdgeCondition<T extends GraphState> = (state: T) => string;

interface Node<T extends GraphState> {
  name: string;
  func: NodeFunction<T>;
}

interface Edge {
  from: string;
  to: string;
  condition?: EdgeCondition<any>;
}

export const START = "__start__";
export const END = "__end__";

// Helper function for appending messages (like add_messages in LangGraph)
export function addMessages(current: BaseMessage[], update: BaseMessage[]): BaseMessage[] {
  return [...current, ...update];
}

export class StateGraph<T extends GraphState> {
  private stateDefinition: StateDefinition;
  private nodes: Map<string, Node<T>> = new Map();
  private edges: Edge[] = [];
  private compiled: boolean = false;
  private startNode: string = "";

  constructor(stateDefinition: StateDefinition) {
    this.stateDefinition = stateDefinition;
  }

  addNode(name: string, func: NodeFunction<T>): this {
    this.nodes.set(name, { name, func });
    return this;
  }

  addEdge(from: string, to: string): this {
    this.edges.push({ from, to });
    
    if (from === START) {
      this.startNode = to;
    }
    
    return this;
  }

  addConditionalEdge(
    from: string,
    condition: EdgeCondition<T>,
    mappings: Record<string, string>
  ): this {
    // For each possible condition result, add an edge
    Object.entries(mappings).forEach(([conditionResult, to]) => {
      this.edges.push({
        from,
        to,
        condition: (state: T) => {
          const result = condition(state);
          return result === conditionResult ? to : "";
        }
      });
    });
    
    return this;
  }

  compile(): CompiledGraph<T> {
    this.compiled = true;
    return new CompiledGraph(this.stateDefinition, this.nodes, this.edges, this.startNode);
  }
}

export class CompiledGraph<T extends GraphState> {
  private stateDefinition: StateDefinition;
  private nodes: Map<string, Node<T>>;
  private edges: Edge[];
  private startNode: string;

  constructor(
    stateDefinition: StateDefinition,
    nodes: Map<string, Node<T>>,
    edges: Edge[],
    startNode: string
  ) {
    this.stateDefinition = stateDefinition;
    this.nodes = nodes;
    this.edges = edges;
    this.startNode = startNode;
  }

  private initializeState(input: Partial<T>): T {
    const state: any = {};
    
    // Initialize state with defaults
    Object.entries(this.stateDefinition).forEach(([key, definition]) => {
      state[key] = definition.default();
    });
    
    // Apply input values
    Object.entries(input).forEach(([key, value]) => {
      if (this.stateDefinition[key]?.reducer) {
        state[key] = this.stateDefinition[key].reducer(state[key], value);
      } else {
        state[key] = value;
      }
    });
    
    return state as T;
  }

  private updateState(currentState: T, updates: Partial<T>): T {
    const newState = { ...currentState };
    
    Object.entries(updates).forEach(([key, value]) => {
      if (this.stateDefinition[key]?.reducer) {
        newState[key] = this.stateDefinition[key].reducer(currentState[key], value);
      } else {
        newState[key] = value;
      }
    });
    
    return newState;
  }

  private getNextNode(currentNode: string, state: T): string | null {
    for (const edge of this.edges) {
      if (edge.from === currentNode) {
        if (edge.condition) {
          const nextNode = edge.condition(state);
          if (nextNode) return nextNode;
        } else {
          return edge.to;
        }
      }
    }
    return null;
  }

  async invoke(input: Partial<T>): Promise<T> {
    let state = this.initializeState(input);
    let currentNode = this.startNode;

    const maxSteps = 100; // Prevent infinite loops
    let steps = 0;

    while (currentNode && currentNode !== END && steps < maxSteps) {
      steps++;
      
      const node = this.nodes.get(currentNode);
      if (!node) {
        throw new Error(`Node ${currentNode} not found`);
      }

      try {
        // Execute node function
        const updates = await node.func(state);
        
        // Update state with results
        state = this.updateState(state, updates);
        
        // Determine next node
        currentNode = this.getNextNode(currentNode, state) || END;
      } catch (error) {
        console.error(`Error executing node ${currentNode}:`, error);
        throw error;
      }
    }

    if (steps >= maxSteps) {
      console.warn("Graph execution reached maximum steps limit");
    }

    return state;
  }

  async *stream(input: Partial<T>): AsyncGenerator<{ node: string; state: T }> {
    let state = this.initializeState(input);
    let currentNode = this.startNode;

    const maxSteps = 100;
    let steps = 0;

    while (currentNode && currentNode !== END && steps < maxSteps) {
      steps++;
      
      const node = this.nodes.get(currentNode);
      if (!node) {
        throw new Error(`Node ${currentNode} not found`);
      }

      try {
        const updates = await node.func(state);
        state = this.updateState(state, updates);
        
        yield { node: currentNode, state };
        
        currentNode = this.getNextNode(currentNode, state) || END;
      } catch (error) {
        console.error(`Error executing node ${currentNode}:`, error);
        throw error;
      }
    }
  }
}
