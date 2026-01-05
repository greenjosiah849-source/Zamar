// Lua Script Runtime Wrapper
class LuaRuntime {
  constructor(options = {}) {
    this.sandbox = {
      print: (...args) => console.log('[Lua]', ...args),
      wait: (seconds) => new Promise(r => setTimeout(r, seconds * 1000)),
      game: {},
      workspace: {},
      Players: {},
      script: {},
      ...options.globals
    };

    this.memory = {
      maxBytes: options.maxMemory || 52428800, // 50MB
      used: 0
    };

    this.environment = new Map();
    this.coroutines = [];
  }

  loadScript(scriptCode, scriptName = 'anonymous') {
    try {
      // In production, use a real Lua VM like fengari-lua
      // For now, we sandbox JavaScript as a placeholder
      const func = new Function(...Object.keys(this.sandbox), scriptCode);
      return func(...Object.values(this.sandbox));
    } catch (error) {
      throw new Error(`Script error in ${scriptName}: ${error.message}`);
    }
  }

  setGlobal(name, value) {
    this.environment.set(name, value);
    this.sandbox[name] = value;
  }

  getGlobal(name) {
    return this.environment.get(name);
  }

  callFunction(func, ...args) {
    try {
      return func(...args);
    } catch (error) {
      console.error('Lua function error:', error);
      throw error;
    }
  }

  spawn(func) {
    const coroutine = {
      id: Math.random().toString(36).substr(2, 9),
      func,
      paused: false,
      createdAt: Date.now()
    };

    this.coroutines.push(coroutine);
    
    // Execute asynchronously
    Promise.resolve().then(() => {
      try {
        this.callFunction(func);
      } catch (e) {
        console.error('Spawned function error:', e);
      }
      // Remove from coroutines when done
      this.coroutines = this.coroutines.filter(c => c.id !== coroutine.id);
    });

    return coroutine.id;
  }

  getMemoryUsage() {
    // Approximate memory usage
    return {
      used: this.memory.used,
      max: this.memory.maxBytes,
      percentUsed: (this.memory.used / this.memory.maxBytes) * 100
    };
  }
}

module.exports = LuaRuntime;
