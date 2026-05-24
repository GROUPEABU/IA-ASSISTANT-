import { useState, useEffect } from 'react'

const STORAGE_KEY = 'abu_generated_products'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function save(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
}

export function useGeneratedProducts() {
  const [generated, setGenerated] = useState(load)

  const add = (product) => {
    setGenerated((prev) => {
      const next = [product, ...prev.filter((p) => p.id !== product.id)]
      save(next)
      return next
    })
  }

  const remove = (id) => {
    setGenerated((prev) => {
      const next = prev.filter((p) => p.id !== id)
      save(next)
      return next
    })
  }

  return { generated, add, remove }
}
