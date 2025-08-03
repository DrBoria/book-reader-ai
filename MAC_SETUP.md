# 🚀 Mac Setup Guide for Book Reader AI Agent (DeepSeek R1)

This AI agent uses **DeepSeek R1** - a powerful open source model that runs locally on your Mac. No data sent to the internet!

## 📋 Requirements

- **macOS 10.15+** (Catalina or newer)
- **Minimum 8 GB RAM** (16 GB recommended)
- **Free disk space:** ~4-8 GB for the model
- **Homebrew** (recommended for installation)

## 🛠️ Quick Installation

### 1. Install Ollama

**Using Homebrew (recommended):**
```bash
brew install ollama
```

**Or download manually:**
- Visit [ollama.com](https://ollama.com/download/mac)
- Download the macOS installer
- Run the installer

### 2. Start Ollama Service
```bash
# Start Ollama in the background
brew services start ollama

# Or start manually
ollama serve
```

### 3. Download DeepSeek R1 Model

Choose one based on your Mac's specs:

**For most Macs (8-16 GB RAM):**
```bash
ollama pull deepseek-r1:7b
```

**For powerful Macs (16+ GB RAM):**
```bash
ollama pull deepseek-r1:14b
```

**For older/slower Macs (< 8 GB RAM):**
```bash
ollama pull deepseek-r1:1.5b
```

### 4. Set up environment variables

Create a `.env` file in the project root:

```env
# Ollama server (default for local)
VITE_OLLAMA_HOST=http://localhost:11434

# Choose the model you downloaded
VITE_DEEPSEEK_MODEL=deepseek-r1:7b
# or VITE_DEEPSEEK_MODEL=deepseek-r1:14b
# or VITE_DEEPSEEK_MODEL=deepseek-r1:1.5b
```

### 5. Install project dependencies
```bash
pnpm install
```

### 6. Run the project
```bash
pnpm dev
```

### 7. Verify it's working

1. Open http://localhost:3000
2. You should see "✅ DeepSeek R1 Ready" in the top right
3. If you see "❌ DeepSeek R1 Unavailable" - check the steps above

## 🔧 Performance Optimization for Mac

### Model Selection by Mac Type:

| Mac Type | RAM | Model | Performance |
|----------|-----|-------|-------------|
| MacBook Air (M1/M2) | 8 GB | `deepseek-r1:7b` | Good |
| MacBook Pro (M1/M2) | 16 GB | `deepseek-r1:7b` | Excellent |
| Mac Studio (M1 Ultra) | 32+ GB | `deepseek-r1:14b` | Outstanding |
| Intel Macs | 8-16 GB | `deepseek-r1:1.5b` | Moderate |

### Apple Silicon Optimization:

Apple Silicon Macs (M1/M2/M3) get automatic acceleration:

```bash
# Check if you have Apple Silicon
system_profiler SPHardwareDataType | grep "Chip"

# Ollama will automatically use the Neural Engine
```

### Memory Management:

```bash
# Check available memory
vm_stat

# Monitor Ollama memory usage
top -pid $(pgrep ollama)
```

## 🐛 Troubleshooting

### Issue: "DeepSeek R1 Unavailable"

**Solutions:**
1. **Check Ollama status:**
   ```bash
   ollama list
   brew services restart ollama
   ```

2. **Verify model is downloaded:**
   ```bash
   ollama list
   # Should show your deepseek-r1 model
   ```

3. **Test model directly:**
   ```bash
   ollama run deepseek-r1:7b "Hello, how are you?"
   ```

### Issue: Model runs slowly

**Solutions:**
1. **Use smaller model:**
   ```bash
   ollama pull deepseek-r1:1.5b
   # Update .env with new model name
   ```

2. **Close other apps:**
   - Quit heavy applications
   - Close unnecessary browser tabs

3. **Check Activity Monitor:**
   - Look for high CPU/memory usage
   - Ensure no other AI tools running

### Issue: "Connection refused" error

**Solutions:**
1. **Start Ollama:**
   ```bash
   ollama serve
   ```

2. **Check port availability:**
   ```bash
   lsof -i :11434
   ```

3. **Restart Ollama:**
   ```bash
   brew services restart ollama
   ```

## 🚀 Advanced Configuration

### Custom Ollama Configuration:

Create `~/.ollama/config.json`:
```json
{
  "gpu_layers": 35,
  "num_ctx": 4096,
  "temperature": 0.1
}
```

### Performance Monitoring:

```bash
# Monitor GPU usage (Apple Silicon)
sudo powermetrics --samplers smc -n 1 | grep -i gpu

# Monitor memory pressure
memory_pressure
```

### Multiple Models:

You can have multiple DeepSeek variants:

```bash
# Download different sizes
ollama pull deepseek-r1:1.5b
ollama pull deepseek-r1:7b
ollama pull deepseek-r1:14b

# Switch between them in .env
```

## 🔒 Privacy & Security

✅ **Local Processing:**
- All AI processing happens on your Mac
- No data sent to external servers
- PDFs stay on your computer

✅ **Network Security:**
- Ollama only listens on localhost by default
- No internet connection required after model download

## 📊 Expected Performance

### Apple Silicon Macs:
- **M1/M2 MacBook Air (8GB):** ~10-15 tokens/second
- **M1/M2 MacBook Pro (16GB):** ~20-30 tokens/second  
- **M1 Max/Ultra (32GB+):** ~40-60 tokens/second

### Intel Macs:
- **Intel MacBook Pro (16GB):** ~5-10 tokens/second
- **Intel iMac (32GB):** ~8-15 tokens/second

## 🆘 Getting Help

If you encounter issues:

1. **Check Ollama logs:**
   ```bash
   tail -f ~/.ollama/logs/server.log
   ```

2. **Restart everything:**
   ```bash
   brew services stop ollama
   brew services start ollama
   pnpm dev
   ```

3. **Verify system requirements:**
   ```bash
   # Check macOS version
   sw_vers
   
   # Check available memory
   vm_stat | grep free
   ```

4. **Test with minimal example:**
   ```bash
   curl http://localhost:11434/api/generate -d '{
     "model": "deepseek-r1:7b",
     "prompt": "Hello world"
   }'
   ```

## 🎉 You're Ready!

Your local AI agent is now set up to:
- 📚 Analyze PDF books
- 🏷️ Tag content automatically
- 💬 Answer questions about content
- 🔒 Keep all your data private

Enjoy analyzing books with DeepSeek R1 on your Mac! 🚀