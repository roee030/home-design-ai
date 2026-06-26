import { v4 as uuidv4 } from 'uuid'
import type { AnalyticsEvent } from '@/types'
import { logger } from './logger'

const SESSION_ID = uuidv4()
const EVENTS_KEY = 'str_analytics_events'

function persist(event: AnalyticsEvent) {
  try {
    const stored = JSON.parse(localStorage.getItem(EVENTS_KEY) ?? '[]') as AnalyticsEvent[]
    stored.push(event)
    localStorage.setItem(EVENTS_KEY, JSON.stringify(stored.slice(-200)))
  } catch {
    // localStorage unavailable (iframe, private mode)
  }
}

function track(name: string, tenantId: string, properties: Record<string, unknown> = {}) {
  const event: AnalyticsEvent = {
    name,
    tenantId,
    sessionId: SESSION_ID,
    timestamp: Date.now(),
    properties,
  }

  logger.info(`[analytics] ${name}`, { tenantId, ...properties })
  persist(event)

  // Production: ship to Segment / Amplitude / GA4
  // window.analytics?.track(name, { tenantId, sessionId: SESSION_ID, ...properties })
}

export const analytics = {
  widgetOpened: (tenantId: string) => track('widget_opened', tenantId),
  widgetClosed: (tenantId: string, screen: string) => track('widget_closed', tenantId, { screen }),
  roomUploaded: (tenantId: string) => track('room_uploaded', tenantId),
  styleSelected: (tenantId: string, style: string) => track('style_selected', tenantId, { style }),
  budgetSet: (tenantId: string, budget: number) => track('budget_set', tenantId, { budget }),
  designGenerated: (tenantId: string, style: string) => track('design_generated', tenantId, { style }),
  productHovered: (tenantId: string, productId: string) => track('product_hovered', tenantId, { productId }),
  variantSwapped: (tenantId: string, productId: string, variantId: string) =>
    track('variant_swapped', tenantId, { productId, variantId }),
  productMoved: (tenantId: string, productId: string) => track('product_moved', tenantId, { productId }),
  addToCart: (tenantId: string, productIds: string[], totalPrice: number) =>
    track('add_to_cart', tenantId, { productIds, totalPrice, itemCount: productIds.length }),
  getEvents: (): AnalyticsEvent[] => {
    try {
      return JSON.parse(localStorage.getItem(EVENTS_KEY) ?? '[]')
    } catch {
      return []
    }
  },
}
