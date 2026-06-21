import type { Component } from 'vue'

export type SchemaGraphNodeBadgeKind = 'input-all' | 'input-any' | 'output-condition' | 'output-parallel'

export interface SchemaGraphNodePalette {
  borderColor?: string
  surfaceColor?: string
  headerBackground?: string
  headerTextColor?: string
  titleTextColor?: string
  mutedTextColor?: string
  footerBackground?: string
  tagBackground?: string
  tagTextColor?: string
  statusBackground?: string
  statusTextColor?: string
  accentColor?: string
}

export interface SchemaGraphNodeStat {
  key: string
  label: string
  value: string
}

export interface SchemaGraphNodeBadge {
  key: string
  kind: SchemaGraphNodeBadgeKind
  tooltip: string
}

export interface SchemaGraphElementProperties {
  lockDelete?: boolean
  lockText?: boolean
  disablePanel?: boolean
  allowIncoming?: boolean
  allowOutgoing?: boolean
  nodeBadges?: SchemaGraphNodeBadge[]
  nodeTitle?: string
  nodeCaption?: string
  nodeTypeLabel?: string
  nodeStatusLabel?: string
  nodePalette?: SchemaGraphNodePalette
  nodeStats?: SchemaGraphNodeStat[]
  [key: string]: any
}

export interface SchemaGraphElementData {
  id: string
  type?: string
  label?: string
  text?: {
    value?: string
    x?: number
    y?: number
  }
  properties?: SchemaGraphElementProperties
  [key: string]: any
}

export interface SchemaGraphData {
  nodes: SchemaGraphElementData[]
  edges: SchemaGraphElementData[]
  [key: string]: any
}

export interface SchemaGraphNodeTemplate {
  key: string
  type: string
  label: string
  description?: string
  width?: number
  height?: number
  properties?: Record<string, any>
}

export interface SchemaGraphPayload {
  type: 'node' | 'edge'
  current: SchemaGraphElementData
  graphData: SchemaGraphData
}

export interface SchemaGraphEdgeAddResult {
  cancel?: boolean
  nextEdgeId?: string
  label?: string
  properties?: SchemaGraphElementProperties
}

export interface SchemaGraphEdgeAddPayload {
  edge: SchemaGraphElementData
  graphData: SchemaGraphData
  patchEdge: (payload: {
    edgeId: string
    nextEdgeId?: string
    label?: string
    properties?: SchemaGraphElementProperties
  }) => void
  removeEdge: (edgeId: string) => void
}

export interface SchemaGraphToolbarClickPayload {
  result?: SchemaGraphData
  graphData: SchemaGraphData
  selectedElement?: SchemaGraphPayload['current'] | null
  addNode: (template?: SchemaGraphNodeTemplate) => SchemaGraphElementData | null
  saveGraph: () => SchemaGraphData
  loadGraph: (data: SchemaGraphData | string) => void
  selectGraph: () => void
  deleteSelected: () => void
  zoomIn: () => void
  zoomOut: () => void
  centerGraph: () => void
  focusGraph: () => void
  arrangeNodes: () => void
}

export interface SchemaGraphToolbarButton {
  key: string
  label: string
  icon?: string | Component
  visible?: boolean
  order?: number
  action?: 'select' | 'addNode' | 'delete' | 'save' | 'zoomIn' | 'zoomOut' | 'center' | 'focusAll' | 'arrange' | 'custom'
  buttonType?: '' | 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  onClick?: (payload: SchemaGraphToolbarClickPayload) => void | Promise<void>
}

export interface SchemaGraphExpose {
  saveGraph: () => SchemaGraphData
  loadGraph: (data: SchemaGraphData | string) => void
  syncGraphDataInPlace: (data: SchemaGraphData | string) => void
  patchNode: (payload: {
    nodeId: string
    nextNodeId?: string
    label?: string
    properties?: SchemaGraphElementProperties
  }) => void
  patchEdge: (payload: {
    edgeId: string
    nextEdgeId?: string
    label?: string
    properties?: SchemaGraphElementProperties
  }) => void
  getSelectedElement: () => SchemaGraphPayload['current'] | null
  exportGraphImage: () => Promise<string>
}