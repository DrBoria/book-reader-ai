import { createContext, useContext } from 'react';
import { RootStoreType } from './RootStore';
import { rootStore } from './RootStore';

const StoreContext = createContext<RootStoreType>(rootStore);

export const StoreProvider = StoreContext.Provider;

export const useStore = () => {
  return useContext(StoreContext);
};

export { rootStore } from './RootStore';
export * from './BookStore';
export * from './TagStore';
export * from './CategoryStore';
export * from './UIStore';