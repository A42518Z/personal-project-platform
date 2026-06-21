try {
  console.log('vue:', await import.meta.resolve('vue'))
  console.log('@vitejs/plugin-vue:', await import.meta.resolve('@vitejs/plugin-vue'))
} catch (error) {
  console.error(error && error.stack ? error.stack : error)
  process.exit(1)
}
