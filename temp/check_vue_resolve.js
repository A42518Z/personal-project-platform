try {
  console.log('vue:', require.resolve('vue'))
  console.log('@vitejs/plugin-vue:', require.resolve('@vitejs/plugin-vue'))
} catch (error) {
  console.error(error && error.stack ? error.stack : error)
  process.exit(1)
}
