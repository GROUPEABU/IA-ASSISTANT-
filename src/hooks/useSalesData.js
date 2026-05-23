import { useMemo } from 'react'
import { MONTHLY_SALES, TOP_MODELS, REGION_DATA, KPI_DATA, REPORT_LIST, TABLE_ROWS } from '@/services/api'

export function useSalesData() {
  return useMemo(() => ({
    monthlySales: MONTHLY_SALES,
    topModels: TOP_MODELS,
    regionData: REGION_DATA,
    kpiData: KPI_DATA,
    reportList: REPORT_LIST,
    tableRows: TABLE_ROWS,
  }), [])
}
