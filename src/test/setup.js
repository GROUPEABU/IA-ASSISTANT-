import '@testing-library/jest-dom'

// Reset localStorage between tests for clean isolation
afterEach(() => {
  localStorage.clear()
})
