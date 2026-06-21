<template>
  <div ref="surfaceRef" class="schema-graph">
    <div class="schema-graph__toolbar">
      <div v-if="$slots['toolbar-leading']" class="schema-graph__toolbar-leading">
        <slot name="toolbar-leading" />
      </div>
      <div class="schema-graph__toolbar-actions">
        <el-button
          v-for="button in visibleToolbarButtons"
          :key="button.key"
        :type="button.buttonType || (isSaveButton(button) ? 'primary' : 'default')"
        :class="[
          'schema-graph__toolbar-button',
          `schema-graph__toolbar-button--${button.action || 'custom'}`,
          {
            'schema-graph__toolbar-button--primary': button.buttonType === 'primary' || isSaveButton(button),
            'schema-graph__toolbar-button--danger': button.buttonType === 'danger'
          }
        ]"
        @click="handleToolbarClick(button)"
      >
        <el-icon v-if="resolveToolbarIcon(button.icon)">
          <component :is="resolveToolbarIcon(button.icon)" />
        </el-icon>
        <span>{{ button.label }}</span>
      </el-button>
      </div>
    </div>

    <div ref="canvasRef" class="schema-graph__canvas"></div>

    <div v-if="nodeBadgeItems.length > 0" class="schema-graph__node-badge-overlay">
      <div
        class="schema-graph__node-badge-overlay-transform"
        :style="{ transform: nodeBadgeTransform || undefined }"
      >
        <div
          v-for="item in nodeBadgeItems"
          :key="item.id"
          class="schema-graph__node-badge-row"
          :style="{
            left: `${item.x}px`,
            top: `${item.y}px`
          }"
        >
          <el-tooltip
            v-for="badge in item.badges"
            :key="badge.key"
            :content="badge.tooltip"
            placement="top"
            effect="dark"
          >
            <button
              type="button"
              class="schema-graph__node-badge"
              :class="`schema-graph__node-badge--${badge.kind}`"
              :aria-label="badge.tooltip"
              @click.stop="handleBadgeNodeClick(item.id)"
            >
              <svg
                v-if="badge.kind === 'input-all'"
                class="schema-graph__node-badge-icon"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 4L11 9" />
                <path d="M4 9H11" />
                <path d="M4 14L11 9" />
                <circle cx="4" cy="4" r="1.2" />
                <circle cx="4" cy="9" r="1.2" />
                <circle cx="4" cy="14" r="1.2" />
                <circle cx="13.5" cy="9" r="1.5" />
              </svg>

              <svg
                v-else-if="badge.kind === 'input-any'"
                class="schema-graph__node-badge-icon"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 4L11 9" opacity="0.28" stroke-dasharray="1.5 2" />
                <path d="M4 14L11 9" opacity="0.28" stroke-dasharray="1.5 2" />
                <path d="M4 9H11" stroke-width="1.7" />
                <circle cx="4" cy="4" r="1.2" opacity="0.28" />
                <circle cx="4" cy="14" r="1.2" opacity="0.28" />
                <circle cx="4" cy="9" r="1.2" />
                <circle cx="13.5" cy="9" r="1.5" />
              </svg>

              <svg
                v-else-if="badge.kind === 'output-condition'"
                class="schema-graph__node-badge-icon"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 9H6.5" />
                <path d="M6.5 9L9 6.5L11.5 9L9 11.5L6.5 9Z" />
                <path d="M11.5 9H14" />
                <path d="M13 8L14.5 9L13 10" />
                <path d="M9 11.5V14" opacity="0.28" stroke-dasharray="1.5 2" />
              </svg>

              <svg
                v-else
                class="schema-graph__node-badge-icon"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3.5 9H7.5" />
                <path d="M7.5 9L12.5 5" />
                <path d="M7.5 9L12.5 13" />
                <path d="M11.5 4H13.5V6" />
                <path d="M11.5 12H13.5V14" />
              </svg>
            </button>
          </el-tooltip>
        </div>
      </div>
    </div>

    <div
      v-if="textEditor.visible"
      class="schema-graph__text-editor"
      :style="{
        left: `${textEditor.left}px`,
        top: `${textEditor.top}px`
      }"
    >
      <input
        ref="textEditorInputRef"
        v-model="textEditor.value"
        class="schema-graph__text-input"
        maxlength="200"
        @blur="commitTextEdit"
      />
    </div>

    <el-dialog
      v-model="panelState.visible"
      :title="panelState.title"
      :width="dialogWidth"
      append-to-body
      destroy-on-close
      @closed="handlePanelClosed"
    >
      <component
        :is="panelState.component"
        v-if="panelState.component && panelState.payload"
        :graphPayload="panelState.payload"
      />
      <el-empty v-else description="未找到配置页面" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, markRaw, nextTick, onBeforeUnmount, onMounted, reactive, ref, resolveDynamicComponent, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Aim, Delete, DocumentChecked, FullScreen, Grid, Plus, ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import LogicFlow, { ElementState, PolylineEdge, PolylineEdgeModel, RectNode, RectNodeModel, TextMode, getPolylinePoints, h as logicFlowH } from '@logicflow/core'
import '@logicflow/core/es/index.css'
import type {
  SchemaGraphData,
  SchemaGraphEdgeAddPayload,
  SchemaGraphEdgeAddResult,
  SchemaGraphElementData,
  SchemaGraphElementProperties,
  SchemaGraphExpose,
  SchemaGraphNodeBadge,
  SchemaGraphNodePalette,
  SchemaGraphNodeTemplate,
  SchemaGraphPayload,
  SchemaGraphNodeStat,
  SchemaGraphToolbarButton,
  SchemaGraphToolbarClickPayload
} from './types'

type LogicFlowGraphData = Parameters<LogicFlow['renderRawData']>[0]

const defaultToolbarButtons: SchemaGraphToolbarButton[] = [
  {
    key: 'select',
    label: '选择',
    action: 'select',
    order: 10
  },
  {
    key: 'add-node',
    label: '新增节点',
    icon: Plus,
    action: 'addNode',
    order: 15,
    buttonType: 'primary'
  },
  {
    key: 'delete',
    label: '删除',
    icon: Delete,
    action: 'delete',
    order: 20,
    buttonType: 'danger'
  },
  {
    key: 'center',
    label: '居中',
    icon: Aim,
    action: 'center',
    order: 30
  },
  {
    key: 'focus-all',
    label: '全图',
    icon: FullScreen,
    action: 'focusAll',
    order: 40
  },
  {
    key: 'arrange',
    label: '对齐',
    icon: Grid,
    action: 'arrange',
    order: 50
  },
  {
    key: 'zoom-in',
    label: '放大',
    icon: ZoomIn,
    action: 'zoomIn',
    order: 60
  },
  {
    key: 'zoom-out',
    label: '缩小',
    icon: ZoomOut,
    action: 'zoomOut',
    order: 70
  },
  {
    key: 'save',
    label: '保存',
    icon: DocumentChecked,
    action: 'save',
    order: 100,
    buttonType: 'primary'
  }
]

const props = withDefaults(defineProps<{
  nodePanelPath?: string
  edgePanelPath?: string
  toolbarButtons?: SchemaGraphToolbarButton[]
  initialData?: SchemaGraphData | string | null
  nodeTemplates?: SchemaGraphNodeTemplate[]
  height?: string
  dialogWidth?: string
  readonly?: boolean
  constrainNodeInCanvas?: boolean
  dialogTitleResolver?: (payload: SchemaGraphPayload) => string
  onEdgeAdd?: (payload: SchemaGraphEdgeAddPayload) => Promise<SchemaGraphEdgeAddResult | boolean | void> | SchemaGraphEdgeAddResult | boolean | void
  onGraphChange?: (graphData: SchemaGraphData) => void
  onNodeClick?: (payload: SchemaGraphPayload) => void
  onEdgeClick?: (payload: SchemaGraphPayload) => void
}>(), {
  nodePanelPath: '',
  edgePanelPath: '',
  toolbarButtons: () => ([]),
  initialData: null,
  nodeTemplates: () => ([{
    key: 'square-default',
    type: 'rect',
    label: '方形图形',
    width: 88,
    height: 88
  }]),
  height: 'calc(100vh - 280px)',
  dialogWidth: '960px',
  readonly: false,
  constrainNodeInCanvas: true,
  dialogTitleResolver: undefined,
  onNodeClick: undefined,
  onEdgeClick: undefined
})

const panelModules = import.meta.glob('/src/views/**/*.vue')
const clickDelay = 220
const dataModelNodeType = 'data-model-node'
const flowPolylineEdgeType = 'flow-polyline'
const builtinNodeTypes = new Set(['rect', 'circle', 'ellipse', 'diamond', 'polygon', 'html', dataModelNodeType])
const builtinEdgeTypes = new Set(['line', 'polyline', 'bezier', flowPolylineEdgeType])
const defaultNodeWidth = 120
const defaultNodeHeight = 56
const nodePlacementPadding = 48
const nodePlacementGap = 24
const nodePlacementTopPadding = 110

type PolylinePoint = { x: number; y: number }
type AdjustedPolylineMovedSide = 'start' | 'end' | 'both'

interface NodeDragAdjustedEdgeSnapshot {
  edgeId: string
  movedSide: AdjustedPolylineMovedSide
  pointsList: PolylinePoint[]
}

interface ActiveNodeDragSnapshot {
  nodeId: string
  startX: number
  startY: number
  edges: NodeDragAdjustedEdgeSnapshot[]
}
interface NodeBadgeOverlayItem {
  id: string
  x: number
  y: number
  badges: SchemaGraphNodeBadge[]
}

function getNodeDisplayLines(properties: SchemaGraphElementProperties) {
  const rawLines = Array.isArray(properties.nodeTextLines)
    ? properties.nodeTextLines
    : []

  return rawLines
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 2)
}

function normalizeNodeCardText(value: unknown, fallback = '') {
  return String(value || fallback || '').trim()
}

function truncateNodeCardText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(maxLength - 1, 1))}…`
}

let nodeCardTextMeasureCanvas: HTMLCanvasElement | null = null

function getNodeCardTextFont(options: {
  fontSize: number
  fontWeight: number
  fontFamily: string
}) {
  return `${options.fontWeight} ${options.fontSize}px ${options.fontFamily}`
}

function measureNodeCardTextWidth(value: string, options: {
  fontSize: number
  fontWeight: number
  fontFamily: string
}) {
  const normalizedValue = String(value || '')
  if (!normalizedValue) {
    return 0
  }

  if (typeof document === 'undefined') {
    return Array.from(normalizedValue).reduce((width, char) => {
      return width + (/[^\u0000-\u00ff]/.test(char) ? options.fontSize : options.fontSize * 0.62)
    }, 0)
  }

  if (!nodeCardTextMeasureCanvas) {
    nodeCardTextMeasureCanvas = document.createElement('canvas')
  }

  const context = nodeCardTextMeasureCanvas.getContext('2d')
  if (!context) {
    return normalizedValue.length * options.fontSize
  }

  context.font = getNodeCardTextFont(options)
  return context.measureText(normalizedValue).width
}

function clampNodeCardTextByWidth(value: string, options: {
  maxWidth: number
  fontSize: number
  fontWeight: number
  fontFamily: string
}) {
  const normalizedValue = normalizeNodeCardText(value)
  if (!normalizedValue || options.maxWidth <= 0) {
    return ''
  }

  if (measureNodeCardTextWidth(normalizedValue, options) <= options.maxWidth) {
    return normalizedValue
  }

  const characters = Array.from(normalizedValue)
  while (characters.length > 0) {
    const candidate = `${characters.join('')}…`
    if (measureNodeCardTextWidth(candidate, options) <= options.maxWidth) {
      return candidate
    }
    characters.pop()
  }

  return '…'
}

function buildNodeCardTextLines(value: string, options: {
  maxWidth: number
  maxLines: number
  fontSize: number
  fontWeight: number
  fontFamily: string
}) {
  const normalizedValue = normalizeNodeCardText(value)
  if (!normalizedValue || options.maxWidth <= 0 || options.maxLines <= 0) {
    return [] as string[]
  }

  const characters = Array.from(normalizedValue)
  const lines: string[] = []
  let startIndex = 0

  while (startIndex < characters.length && lines.length < options.maxLines) {
    if (lines.length === options.maxLines - 1) {
      lines.push(clampNodeCardTextByWidth(characters.slice(startIndex).join(''), options))
      break
    }

    let endIndex = startIndex
    let currentLine = ''
    while (endIndex < characters.length) {
      const nextLine = currentLine + characters[endIndex]
      if (measureNodeCardTextWidth(nextLine, options) <= options.maxWidth || !currentLine) {
        currentLine = nextLine
        endIndex += 1
        continue
      }
      break
    }

    if (!currentLine) {
      currentLine = characters[startIndex]
      endIndex = startIndex + 1
    }

    lines.push(currentLine)
    startIndex = endIndex
  }

  return lines.filter(Boolean)
}

function getNodeCardPalette(properties: SchemaGraphElementProperties): Required<SchemaGraphNodePalette> {
  const palette = (properties.nodePalette || {}) as SchemaGraphNodePalette

  return {
    borderColor: normalizeNodeCardText(palette.borderColor, '#d8e1ee'),
    surfaceColor: normalizeNodeCardText(palette.surfaceColor, '#ffffff'),
    headerBackground: normalizeNodeCardText(palette.headerBackground, '#eef5ff'),
    headerTextColor: normalizeNodeCardText(palette.headerTextColor, '#1d4ed8'),
    titleTextColor: normalizeNodeCardText(palette.titleTextColor, '#132238'),
    mutedTextColor: normalizeNodeCardText(palette.mutedTextColor, '#64748b'),
    footerBackground: normalizeNodeCardText(palette.footerBackground, '#f8fafc'),
    tagBackground: normalizeNodeCardText(palette.tagBackground, '#dbeafe'),
    tagTextColor: normalizeNodeCardText(palette.tagTextColor, '#1d4ed8'),
    statusBackground: normalizeNodeCardText(palette.statusBackground, '#eef2f7'),
    statusTextColor: normalizeNodeCardText(palette.statusTextColor, '#475569'),
    accentColor: normalizeNodeCardText(palette.accentColor, '#3b82f6')
  }
}

class DataModelRectNodeModel extends RectNodeModel {
  initNodeData(data: any) {
    super.initNodeData(data)

    const nextWidth = Number(data?.width || 0)
    const nextHeight = Number(data?.height || 0)

    if (Number.isFinite(nextWidth) && nextWidth > 0) {
      this.width = nextWidth
    }

    if (Number.isFinite(nextHeight) && nextHeight > 0) {
      this.height = nextHeight
    }
  }
}

class DataModelRectNode extends RectNode<any> {
  getShape() {
    const { model } = this.props as any
    const properties = (model.getProperties?.() || model.properties || {}) as SchemaGraphElementProperties
    const fontFamily = 'Microsoft YaHei, PingFang SC, Helvetica Neue, Arial, sans-serif'
    const typeLabel = truncateNodeCardText(normalizeNodeCardText(properties.nodeTypeLabel, '数据模型'), 14)
    const rawTitle = normalizeNodeCardText(properties.nodeTitle, String(model.text?.value || model.label || ''))
    const rawCaption = normalizeNodeCardText(properties.nodeCaption)
    const statusLabel = truncateNodeCardText(normalizeNodeCardText(properties.nodeStatusLabel), 10)
    const isMainBusinessNode = statusLabel === '主业务'
    const isBusinessNode = !isMainBusinessNode && statusLabel === '业务模型'
    const titleTextOptions = {
      maxWidth: Math.max(Number(model.width || 184) - 32, 40),
      maxLines: 2,
      fontSize: 16,
      fontWeight: 600,
      fontFamily
    }
    const titleLines = buildNodeCardTextLines(rawTitle, titleTextOptions)
    const title = titleLines[0] || ''
    const secondaryTitle = titleLines[1] || ''
    const titleAccentReference = secondaryTitle || title
    const caption = clampNodeCardTextByWidth(rawCaption, {
      maxWidth: Math.max(Number(model.width || 184) - 44, 32),
      fontSize: 12,
      fontWeight: 500,
      fontFamily
    })

    if (!typeLabel && !title) {
      return super.getShape()
    }

    const palette = getNodeCardPalette(properties)
    const x = Number(model.x || 0)
    const y = Number(model.y || 0)
    const width = Number(model.width || 184)
    const height = Number(model.height || 108)
    const left = x - width / 2
    const top = y - height / 2
    const headerHeight = 28
    const bodyTop = top + headerHeight + 15
    const innerLeft = left + 16
    const titleY = bodyTop
    const secondaryTitleY = titleY + 18
    const titleAccentY = (secondaryTitle ? secondaryTitleY : titleY) + 13
    const captionY = titleAccentY + 17
    const titleAccentWidth = Math.max(32, Math.min(
      width - 32,
      measureNodeCardTextWidth(titleAccentReference, {
        fontSize: 16,
        fontWeight: 600,
        fontFamily
      })
    ))
    const accentBarWidth = isMainBusinessNode ? 9 : (isBusinessNode ? 7 : 4)
    const accentBarOpacity = isMainBusinessNode ? 0.2 : (isBusinessNode ? 0.16 : 0.08)
    const frameStrokeWidth = isMainBusinessNode ? 1.8 : (isBusinessNode ? 1.55 : 1.3)
    const markerOuterRadius = isMainBusinessNode ? 5.8 : (isBusinessNode ? 5 : 4.2)
    const markerInnerRadius = isMainBusinessNode ? 2.8 : (isBusinessNode ? 2.5 : 2.1)
    const frameHaloPadding = isMainBusinessNode ? 4 : (isBusinessNode ? 3 : 0)
    const captionPillWidth = Math.min(
      width - 34,
      Math.max(76, Math.ceil(measureNodeCardTextWidth(caption, {
        fontSize: 12,
        fontWeight: 500,
        fontFamily
      }) + 18))
    )
    const titleTooltip = [rawTitle, rawCaption].filter(Boolean).join('\n')
    const children: any[] = [
      ...(titleTooltip
        ? [logicFlowH('title', {}, titleTooltip)]
        : []),
      ...(frameHaloPadding > 0
        ? [logicFlowH('rect', {
            x: left - frameHaloPadding,
            y: top - frameHaloPadding,
            rx: 16 + frameHaloPadding,
            ry: 16 + frameHaloPadding,
            width: width + frameHaloPadding * 2,
            height: height + frameHaloPadding * 2,
            fill: isMainBusinessNode ? '#fff1f2' : '#eff6ff',
            fillOpacity: isMainBusinessNode ? 0.88 : 0.78,
            stroke: palette.accentColor,
            strokeWidth: isMainBusinessNode ? 1.1 : 0.95,
            strokeOpacity: isMainBusinessNode ? 0.22 : 0.16
          })]
        : []),
      logicFlowH('rect', {
        x: left,
        y: top,
        rx: 16,
        ry: 16,
        width,
        height,
        fill: palette.surfaceColor,
        stroke: palette.borderColor,
        strokeWidth: frameStrokeWidth
      }),
      logicFlowH('rect', {
        x: left + 1,
        y: top + 1,
        rx: 15,
        ry: 15,
        width: width - 2,
        height: headerHeight,
        fill: palette.headerBackground,
        stroke: 'transparent'
      }),
      logicFlowH('rect', {
        x: left + 1,
        y: top + 1,
        rx: 15,
        ry: 15,
        width: accentBarWidth,
        height: height - 2,
        fill: palette.accentColor,
        fillOpacity: accentBarOpacity,
        stroke: 'transparent'
      }),
      logicFlowH('circle', {
        cx: innerLeft + 4,
        cy: top + 16,
        r: markerOuterRadius,
        fill: '#ffffff',
        stroke: palette.accentColor,
        strokeWidth: isMainBusinessNode ? 1.8 : (isBusinessNode ? 1.5 : 1.3)
      }),
      logicFlowH('circle', {
        cx: innerLeft + 4,
        cy: top + 16,
        r: markerInnerRadius,
        fill: palette.accentColor
      }),
      logicFlowH('text', {
        x: innerLeft + 14,
        y: top + 17,
        fill: palette.headerTextColor,
        fontSize: 11,
        fontWeight: 600,
        fontFamily,
        dominantBaseline: 'middle',
        pointerEvents: 'none'
      }, typeLabel),
      logicFlowH('text', {
        x: innerLeft,
        y: titleY,
        fill: palette.titleTextColor,
        fontSize: 16,
        fontWeight: 600,
        fontFamily,
        dominantBaseline: 'middle',
        pointerEvents: 'none'
      }, title),
      ...(secondaryTitle
        ? [logicFlowH('text', {
            x: innerLeft,
            y: secondaryTitleY,
            fill: palette.titleTextColor,
            fontSize: 16,
            fontWeight: 600,
            fontFamily,
            dominantBaseline: 'middle',
            pointerEvents: 'none'
          }, secondaryTitle)]
        : []),
      logicFlowH('line', {
        x1: innerLeft,
        y1: titleAccentY,
        x2: innerLeft + titleAccentWidth,
        y2: titleAccentY,
        stroke: palette.accentColor,
        strokeWidth: isMainBusinessNode ? 3 : 2.4,
        strokeOpacity: isMainBusinessNode ? 0.42 : (isBusinessNode ? 0.34 : 0.22),
        strokeLinecap: 'round'
      })
    ]

    if (statusLabel) {
      const statusWidth = Math.max(62, statusLabel.length * 13 + 20)
      const statusX = left + width - statusWidth - 12
      children.push(
        logicFlowH('rect', {
          x: statusX,
          y: top + 7,
          rx: 10,
          ry: 10,
          width: statusWidth,
          height: 18,
          fill: palette.statusBackground,
          stroke: 'transparent'
        }),
        logicFlowH('text', {
          x: statusX + statusWidth / 2,
          y: top + 16,
          fill: palette.statusTextColor,
          fontSize: 10,
          fontWeight: 600,
          fontFamily,
          textAnchor: 'middle',
          dominantBaseline: 'middle',
          pointerEvents: 'none'
        }, statusLabel)
      )
    }

    if (caption) {
      children.push(logicFlowH('rect', {
        x: innerLeft - 4,
        y: captionY - 10,
        rx: 10,
        ry: 10,
        width: captionPillWidth,
        height: 20,
        fill: palette.footerBackground,
        stroke: 'transparent'
      }))
      children.push(logicFlowH('text', {
        x: innerLeft,
        y: captionY,
        fill: palette.mutedTextColor,
        fontSize: 12,
        fontWeight: 500,
        fontFamily,
        dominantBaseline: 'middle',
        pointerEvents: 'none'
      }, caption))
    }

    return logicFlowH('g', { className: 'schema-graph__card-node' }, children)
  }

  getText() {
    const { model, graphModel } = this.props as any
    const editConfigModel = graphModel.editConfigModel
    if (editConfigModel.nodeTextMode !== TextMode.TEXT) {
      return null
    }

    if (model.state === ElementState.TEXT_EDIT) {
      return null
    }

    return null
  }
}

class FlowPolylineEdgeModel extends PolylineEdgeModel {
  setAttributes() {
    super.setAttributes()

    const style = (this.properties as Record<string, any>)?.style
    if (style && typeof style === 'object' && Object.keys(style).length > 0) {
      this.setStyles(style)
    }
  }

  getArrowStyle() {
    const baseStyle = super.getArrowStyle()

    return {
      ...baseStyle,
      startArrowType: 'none' as const,
      endArrowType: 'none' as const
    }
  }
}

const SUBMIT_TYPE_COLORS: Record<string, string> = {
  oneToOne: '#2563eb',
  oneToMany: '#f59e0b',
  manyToMany: '#8b5cf6',
  manyToOne: '#10b981'
}

const SUBMIT_TYPE_BOLD_STROKE = 2.5
const SUBMIT_TYPE_NORMAL_STROKE = 1.5
const MARKER_STROKE_WIDTH = 1.5
const CIRCLE_RADIUS = 4.5
const ARROW_LENGTH = 10
const ARROW_HALF_WIDTH = 5


function getEdgeRenderPoint(value: any): PolylinePoint | null {
  const x = Number(value?.x)
  const y = Number(value?.y)
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
}

function getEdgeModelPointList(edgeModel: any): PolylinePoint[] {
  return (Array.isArray(edgeModel?.pointsList) ? edgeModel.pointsList : [])
    .map((point: any) => getEdgeRenderPoint(point))
    .filter((point: PolylinePoint | null): point is PolylinePoint => Boolean(point))
}

function getLogicNodeId(nodeModel: any) {
  return String(nodeModel?.id || nodeModel?.properties?.id || '').trim()
}

function getLogicNodeBox(nodeModel: any, margin = 24) {
  const x = Number(nodeModel?.x)
  const y = Number(nodeModel?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  const width = Number(nodeModel?.width || 120)
  const height = Number(nodeModel?.height || 56)
  return {
    id: getLogicNodeId(nodeModel),
    left: x - width / 2 - margin,
    right: x + width / 2 + margin,
    top: y - height / 2 - margin,
    bottom: y + height / 2 + margin
  }
}

function getGraphNodeModelsFromEdge(edgeModel: any) {
  const graphModel = edgeModel?.graphModel || edgeModel?.sourceNode?.graphModel || edgeModel?.targetNode?.graphModel
  if (!graphModel) return [] as any[]
  if (Array.isArray(graphModel.nodes)) return graphModel.nodes
  const nodeMap = graphModel.nodesMap || graphModel.nodeMap || graphModel.modelsMap
  if (nodeMap?.values && typeof nodeMap.values === 'function') return Array.from(nodeMap.values())
  if (nodeMap && typeof nodeMap === 'object') return Object.values(nodeMap)
  return [] as any[]
}

function getRouteObstacleBoxes(edgeModel: any) {
  const sourceNodeId = String(edgeModel?.sourceNodeId || edgeModel?.sourceNode?.id || '').trim()
  const targetNodeId = String(edgeModel?.targetNodeId || edgeModel?.targetNode?.id || '').trim()
  return getGraphNodeModelsFromEdge(edgeModel)
    .map((nodeModel: any) => getLogicNodeBox(nodeModel))
    .filter((box: ReturnType<typeof getLogicNodeBox>): box is NonNullable<ReturnType<typeof getLogicNodeBox>> => Boolean(box?.id))
    .filter((box: NonNullable<ReturnType<typeof getLogicNodeBox>>) => box.id !== sourceNodeId && box.id !== targetNodeId)
}

function segmentIntersectsBox(start: PolylinePoint, end: PolylinePoint, box: { left: number; right: number; top: number; bottom: number }) {
  const minX = Math.min(start.x, end.x)
  const maxX = Math.max(start.x, end.x)
  const minY = Math.min(start.y, end.y)
  const maxY = Math.max(start.y, end.y)
  if (Math.abs(start.x - end.x) < 0.01) return start.x >= box.left && start.x <= box.right && maxY >= box.top && minY <= box.bottom
  if (Math.abs(start.y - end.y) < 0.01) return start.y >= box.top && start.y <= box.bottom && maxX >= box.left && minX <= box.right
  return maxX >= box.left && minX <= box.right && maxY >= box.top && minY <= box.bottom
}

function pathIntersectsBoxes(points: PolylinePoint[], boxes: Array<{ left: number; right: number; top: number; bottom: number }>) {
  for (let index = 1; index < points.length; index += 1) {
    if (boxes.some((box) => segmentIntersectsBox(points[index - 1], points[index], box))) return true
  }
  return false
}

function routeLength(points: PolylinePoint[]) {
  let total = 0
  for (let index = 1; index < points.length; index += 1) total += Math.abs(points[index].x - points[index - 1].x) + Math.abs(points[index].y - points[index - 1].y)
  return total
}

function uniqueRouteValues(values: number[]) {
  return Array.from(new Set(values.map((value) => Math.round(value)).filter(Number.isFinite)))
}

function buildAvoidNodePolyline(edgeModel: any) {
  const rawPoints = getEdgeModelPointList(edgeModel)
  const start = getEdgeRenderPoint(edgeModel?.startPoint) || rawPoints[0]
  const end = getEdgeRenderPoint(edgeModel?.endPoint) || rawPoints[rawPoints.length - 1]
  if (!start || !end) return rawPoints
  const boxes = getRouteObstacleBoxes(edgeModel)
  const direct = rawPoints.length >= 2 ? rawPoints : [start, end]
  if (!boxes.length || !pathIntersectsBoxes(direct, boxes)) return direct

  const margin = 50
  const leftMost = Math.min(...boxes.map((box: NonNullable<ReturnType<typeof getLogicNodeBox>>) => box.left), start.x, end.x)
  const rightMost = Math.max(...boxes.map((box: NonNullable<ReturnType<typeof getLogicNodeBox>>) => box.right), start.x, end.x)
  const topMost = Math.min(...boxes.map((box: NonNullable<ReturnType<typeof getLogicNodeBox>>) => box.top), start.y, end.y)
  const bottomMost = Math.max(...boxes.map((box: NonNullable<ReturnType<typeof getLogicNodeBox>>) => box.bottom), start.y, end.y)
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const xCandidates = uniqueRouteValues([midX, leftMost - margin, rightMost + margin, ...boxes.flatMap((box: NonNullable<ReturnType<typeof getLogicNodeBox>>) => [box.left - margin, box.right + margin])])
  const yCandidates = uniqueRouteValues([midY, topMost - margin, bottomMost + margin, ...boxes.flatMap((box: NonNullable<ReturnType<typeof getLogicNodeBox>>) => [box.top - margin, box.bottom + margin])])
  const routes = [
    ...xCandidates.map((x) => [start, { x, y: start.y }, { x, y: end.y }, end]),
    ...yCandidates.map((y) => [start, { x: start.x, y }, { x: end.x, y }, end])
  ].sort((left, right) => routeLength(left) - routeLength(right))
  return routes.find((route) => !pathIntersectsBoxes(route, boxes)) || routes[0] || direct
}

function getLabelSegment(points: PolylinePoint[]) {
  if (points.length < 2) return null
  return points.slice(1).map((point, index) => {
    const start = points[index]
    const end = point
    return { start, end, length: Math.hypot(end.x - start.x, end.y - start.y) }
  }).filter((item) => item.length > 1).sort((left, right) => right.length - left.length)[0] || null
}

function normalizeEdgeLabelAngle(angle: number) {
  let next = angle
  while (next > Math.PI / 2) next -= Math.PI
  while (next < -Math.PI / 2) next += Math.PI
  return next
}

function renderFloatingEdgeLabel(points: PolylinePoint[], label: string, options: { opacity?: number }) {
  const text = String(label || '').trim()
  const segment = getLabelSegment(points)
  if (!text || !segment) return [] as any[]

  const dx = segment.end.x - segment.start.x
  const dy = segment.end.y - segment.start.y
  const isHorizontal = Math.abs(dx) >= Math.abs(dy) * 1.2
  const midX = (segment.start.x + segment.end.x) / 2
  const midY = (segment.start.y + segment.end.y) / 2
  const fontFamily = 'Microsoft YaHei, PingFang SC, Helvetica Neue, Arial, sans-serif'
  const opacity = Number(options.opacity ?? 1)

  if (isHorizontal) {
    return [logicFlowH('text', {
      x: midX,
      y: midY - 18,
      fill: '#1f2937',
      opacity,
      fontSize: 12,
      fontWeight: 700,
      fontFamily,
      textAnchor: 'middle',
      dominantBaseline: 'middle',
      pointerEvents: 'none'
    }, text)]
  }

  // 竖线/斜线：从上往下展示，但字符本身不旋转。
  // 通过 tspan 逐字符换行实现，保证字段顺序从上到下保持不变。
  const chars = Array.from(text)
  const lineHeight = 13
  const startY = midY - ((chars.length - 1) * lineHeight) / 2
  const offsetX = dx >= 0 ? 16 : -16
  const x = midX + offsetX

  return [logicFlowH('text', {
    x,
    y: startY,
    fill: '#1f2937',
    opacity,
    fontSize: 12,
    fontWeight: 700,
    fontFamily,
    textAnchor: 'middle',
    dominantBaseline: 'middle',
    pointerEvents: 'none'
  }, chars.map((char, index) => logicFlowH('tspan', {
    x,
    dy: index === 0 ? 0 : lineHeight
  }, char)))]
}
class FlowSubmitTypeEdge extends PolylineEdge {
  getText() {
    return null
  }

  getShape() {
    const { model } = this.props as any
    const properties = ((typeof model.getProperties === 'function' ? model.getProperties() : null) || model.properties || {}) as Record<string, any>
    const pointsList: PolylinePoint[] = properties.avoidNodes
      ? buildAvoidNodePolyline(model)
      : (Array.isArray(model.pointsList) ? model.pointsList : [])
    const submitType = (properties.submitType as string) || 'oneToOne'
    const style = (properties.style || {}) as Record<string, any>

    const color = SUBMIT_TYPE_COLORS[submitType] || SUBMIT_TYPE_COLORS.oneToOne
    const isBold = submitType === 'oneToMany' || submitType === 'manyToMany'
    const strokeWidth = style.strokeWidth || (isBold ? SUBMIT_TYPE_BOLD_STROKE : SUBMIT_TYPE_NORMAL_STROKE)
    const strokeDasharray = style.strokeDasharray || ''

    const isSolidStart = submitType === 'manyToMany' || submitType === 'manyToOne'
    const isSolidEnd = submitType === 'oneToMany' || submitType === 'manyToMany'
    const children: any[] = []

    if (pointsList.length >= 2) {
      let pathD = 'M ' + pointsList[0].x + ' ' + pointsList[0].y
      for (let i = 1; i < pointsList.length; i += 1) {
        pathD += ' L ' + pointsList[i].x + ' ' + pointsList[i].y
      }

      children.push(logicFlowH('path', {
        d: pathD,
        stroke: color,
        strokeWidth,
        fill: 'none',
        strokeDasharray,
        strokeLinejoin: 'round',
        strokeLinecap: 'round'
      }))

      const startX = pointsList[0].x
      const startY = pointsList[0].y
      const startAngle = Math.atan2(pointsList[1].y - startY, pointsList[1].x - startX)
      const circleCx = startX + CIRCLE_RADIUS * Math.cos(startAngle)
      const circleCy = startY + CIRCLE_RADIUS * Math.sin(startAngle)
      children.push(logicFlowH('circle', {
        cx: circleCx,
        cy: circleCy,
        r: CIRCLE_RADIUS,
        fill: isSolidStart ? color : '#ffffff',
        stroke: color,
        strokeWidth: MARKER_STROKE_WIDTH
      }))

      const lastIdx = pointsList.length - 1
      const endX = pointsList[lastIdx].x
      const endY = pointsList[lastIdx].y
      const prevX = pointsList[lastIdx - 1].x
      const prevY = pointsList[lastIdx - 1].y
      const angle = Math.atan2(endY - prevY, endX - prevX)
      const baseX = endX - ARROW_LENGTH * Math.cos(angle)
      const baseY = endY - ARROW_LENGTH * Math.sin(angle)
      const leftX = baseX - ARROW_HALF_WIDTH * Math.cos(angle - Math.PI / 2)
      const leftY = baseY - ARROW_HALF_WIDTH * Math.sin(angle - Math.PI / 2)
      const rightX = baseX - ARROW_HALF_WIDTH * Math.cos(angle + Math.PI / 2)
      const rightY = baseY - ARROW_HALF_WIDTH * Math.sin(angle + Math.PI / 2)
      const arrowD = 'M ' + endX + ' ' + endY + ' L ' + leftX + ' ' + leftY + ' L ' + rightX + ' ' + rightY + ' Z'

      children.push(logicFlowH('path', {
        d: arrowD,
        fill: isSolidEnd ? color : '#ffffff',
        stroke: color,
        strokeWidth: MARKER_STROKE_WIDTH,
        strokeLinejoin: 'round'
      }))

      if (properties.renderInlineLabel && properties.showLabel !== false) {
        const label = String(properties.edgeLabel || model?.text?.value || model?.label || '')
        children.push(...renderFloatingEdgeLabel(pointsList, label, { opacity: style.opacity }))
      }
    }

    return logicFlowH('g', {}, children)
  }
}

function normalizeGraphPointValue(value: unknown) {
  const next = Number(value || 0)
  if (!Number.isFinite(next)) {
    return 0
  }

  return Number(next.toFixed(2))
}

function serializePolylinePoints(points?: Array<{ x: number; y: number }>) {
  return JSON.stringify((points || []).map(point => ({
    x: normalizeGraphPointValue(point.x),
    y: normalizeGraphPointValue(point.y)
  })))
}

function clonePolylinePoints(points?: PolylinePoint[]) {
  return (points || []).map(point => ({
    x: Number(point.x || 0),
    y: Number(point.y || 0)
  }))
}

function getAutoPolylinePoints(edgeModel: any) {
  if (!edgeModel?.startPoint || !edgeModel?.endPoint || !edgeModel?.sourceNode || !edgeModel?.targetNode) {
    return []
  }

  return edgeModel.orthogonalizePath(getPolylinePoints(
    {
      x: edgeModel.startPoint.x,
      y: edgeModel.startPoint.y
    },
    {
      x: edgeModel.endPoint.x,
      y: edgeModel.endPoint.y
    },
    edgeModel.sourceNode,
    edgeModel.targetNode,
    edgeModel.offset || 0
  ))
}

function hasAdjustedPolylinePath(edgeModel: any) {
  const currentPoints = Array.isArray(edgeModel?.pointsList) ? edgeModel.pointsList : []
  if (currentPoints.length < 3) {
    return false
  }

  return serializePolylinePoints(currentPoints) !== serializePolylinePoints(getAutoPolylinePoints(edgeModel))
}

function buildAdjustedPolylinePoints(pointsList: PolylinePoint[], deltaX: number, deltaY: number, movedSide: AdjustedPolylineMovedSide) {
  const currentPoints = clonePolylinePoints(pointsList)
  if (currentPoints.length < 2) {
    return null
  }

  if (movedSide === 'both') {
    currentPoints.forEach((point) => {
      point.x += deltaX
      point.y += deltaY
    })
    return currentPoints
  }

  if (movedSide === 'start') {
    const startPoint = currentPoints[0]
    const nextPoint = currentPoints[1]
    if (!startPoint || !nextPoint) {
      return null
    }

    startPoint.x += deltaX
    startPoint.y += deltaY

    if (Math.abs(startPoint.x - deltaX - nextPoint.x) < 0.01) {
      nextPoint.x += deltaX
    } else if (Math.abs(startPoint.y - deltaY - nextPoint.y) < 0.01) {
      nextPoint.y += deltaY
    } else {
      return null
    }

    return currentPoints
  }

  const endIndex = currentPoints.length - 1
  const previousPoint = currentPoints[endIndex - 1]
  const endPoint = currentPoints[endIndex]
  if (!previousPoint || !endPoint) {
    return null
  }

  endPoint.x += deltaX
  endPoint.y += deltaY

  if (Math.abs(previousPoint.x - (endPoint.x - deltaX)) < 0.01) {
    previousPoint.x += deltaX
  } else if (Math.abs(previousPoint.y - (endPoint.y - deltaY)) < 0.01) {
    previousPoint.y += deltaY
  } else {
    return null
  }

  return currentPoints
}

const surfaceRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLDivElement | null>(null)
const textEditorInputRef = ref<HTMLInputElement | null>(null)
const logicFlowRef = shallowRef<LogicFlow | null>(null)
let clickTimer: number | null = null
let pendingGraphChangeFrame: number | null = null
let suppressNodeClickUntil = 0
let suppressNodeClickNodeId = ''
let lastEmittedGraphSignature = ''
let resizeObserver: ResizeObserver | null = null
let activeNodeDragSnapshot: ActiveNodeDragSnapshot | null = null
let suspendMutationCallbacks = false

const textEditor = reactive({
  visible: false,
  targetId: '',
  targetType: 'node' as 'node' | 'edge',
  value: '',
  left: 0,
  top: 0
})

const panelState = reactive({
  visible: false,
  title: '属性配置',
  component: null as any,
  payload: null as SchemaGraphPayload | null
})

const selectedElement = ref<SchemaGraphPayload['current'] | null>(null)
const nodeBadgeRenderVersion = ref(0)
const nodeBadgeTransform = ref('')

const nodeBadgeItems = computed(() => {
  nodeBadgeRenderVersion.value

  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return [] as NodeBadgeOverlayItem[]
  }

  const graphData = logicFlow.getGraphRawData() as SchemaGraphData
  return (graphData.nodes || []).reduce((result, node) => {
    const nodeId = String(node.id || '').trim()
    const rawBadges = getElementProperties(node).nodeBadges
    const badges = Array.isArray(rawBadges)
      ? rawBadges.filter((badge): badge is SchemaGraphNodeBadge => {
        return Boolean(badge?.key && badge?.kind && badge?.tooltip)
      })
      : []

    if (!nodeId || badges.length === 0) {
      return result
    }

    const position = getNodePosition(logicFlow, node)
    const size = getCurrentNodeSize(logicFlow, node)
    result.push({
      id: nodeId,
      x: position.x,
      y: position.y + size.height / 2 - 24,
      badges
    })

    return result
  }, [] as NodeBadgeOverlayItem[])
})

const visibleToolbarButtons = computed(() => {
  const mergedButtons = [...defaultToolbarButtons]

  props.toolbarButtons.forEach((button) => {
    const identity = button.action && button.action !== 'custom'
      ? `action:${button.action}`
      : `key:${button.key}`
    const index = mergedButtons.findIndex((item) => {
      const currentIdentity = item.action && item.action !== 'custom'
        ? `action:${item.action}`
        : `key:${item.key}`
      return currentIdentity === identity
    })

    if (index >= 0) {
      mergedButtons[index] = {
        ...mergedButtons[index],
        ...button
      }
      return
    }

    mergedButtons.push(button)
  })

  return mergedButtons
    .filter((button) => {
      if (button.visible === false) {
        return false
      }

      if (button.action === 'addNode') {
        return !props.readonly && props.nodeTemplates.length > 0
      }

      return true
    })
    .sort((left, right) => (left.order ?? 99) - (right.order ?? 99))
})

// 统一路径格式，避免父组件传入不同写法时找不到视图组件。
function normalizeViewPath(value?: string) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^@\/views\//, '')
    .replace(/^\/?src\/views\//, '')
    .replace(/^\/+/, '')
    .replace(/\.vue$/i, '')
    .replace(/\/+$/g, '')
}

function getViewCandidates(viewPath?: string) {
  const normalized = normalizeViewPath(viewPath)
  if (!normalized) {
    return []
  }

  const candidates = new Set<string>()
  candidates.add(`/src/views/${normalized}.vue`)
  candidates.add(`/src/views/${normalized}/index.vue`)

  return Array.from(candidates)
}

function getGraphLabel(item?: SchemaGraphElementData | null) {
  if (!item) {
    return ''
  }

  if (typeof item.label === 'string') {
    return item.label
  }

  return String(item.text?.value || '')
}

function getElementProperties(item?: SchemaGraphElementData | null): SchemaGraphElementProperties {
  if (!item || typeof item.properties !== 'object' || !item.properties) {
    return {}
  }

  return item.properties as SchemaGraphElementProperties
}

function isDeleteLocked(item?: SchemaGraphElementData | null) {
  return Boolean(getElementProperties(item).lockDelete)
}

function isTextLocked(item?: SchemaGraphElementData | null) {
  return Boolean(getElementProperties(item).lockText)
}

function isPanelDisabled(item?: SchemaGraphElementData | null) {
  return Boolean(getElementProperties(item).disablePanel)
}

function createDenyConnectRule() {
  return {
    message: '',
    validate: () => false
  }
}

// 保存时补一份 label，便于业务页面直接读取，而不影响 LogicFlow 原生 text 结构。
function enrichElementData(item: SchemaGraphElementData) {
  return {
    ...item,
    label: getGraphLabel(item)
  }
}

function emitGraphChange() {
  if (!props.onGraphChange || suspendMutationCallbacks || !logicFlowRef.value) {
    return
  }

  const graphData = saveGraph()
  lastEmittedGraphSignature = buildGraphSignature(graphData)
  props.onGraphChange(graphData)
}

function scheduleGraphChange() {
  if (pendingGraphChangeFrame !== null) {
    window.cancelAnimationFrame(pendingGraphChangeFrame)
  }

  pendingGraphChangeFrame = window.requestAnimationFrame(() => {
    pendingGraphChangeFrame = null
    emitGraphChange()
  })
}

function suppressDraggedNodeClick(nodeId?: string) {
  suppressNodeClickNodeId = String(nodeId || '').trim()
  suppressNodeClickUntil = Date.now() + 260
}

function shouldSuppressDraggedNodeClick(nodeId?: string) {
  if (Date.now() > suppressNodeClickUntil) {
    suppressNodeClickNodeId = ''
    return false
  }

  const normalizedNodeId = String(nodeId || '').trim()
  return !normalizedNodeId || !suppressNodeClickNodeId || suppressNodeClickNodeId === normalizedNodeId
}

function syncNodeBadgeOverlay() {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    nodeBadgeTransform.value = ''
    nodeBadgeRenderVersion.value += 1
    return
  }

  const transformStyle = (logicFlow as any).graphModel?.transformModel?.getTransformStyle?.().transform
  nodeBadgeTransform.value = typeof transformStyle === 'string' ? transformStyle : ''
  nodeBadgeRenderVersion.value += 1
}

function resolveNodeType(node: SchemaGraphElementData) {
  const rawType = typeof node.type === 'string' ? node.type : ''
  const hasDataModelId = Boolean(String(node.properties?.dataModelId || '').trim())
  if (rawType === dataModelNodeType || (hasDataModelId && (!rawType || rawType === 'rect'))) {
    return dataModelNodeType
  }

  return builtinNodeTypes.has(rawType) ? rawType : 'rect'
}

function normalizeGraphData(input?: SchemaGraphData | string | null): SchemaGraphData {
  if (!input) {
    return { nodes: [], edges: [] }
  }

  let source: SchemaGraphData | null = null
  try {
    source = typeof input === 'string' ? JSON.parse(input) : input
  } catch {
    return { nodes: [], edges: [] }
  }
  const graphData = JSON.parse(JSON.stringify(source || { nodes: [], edges: [] })) as SchemaGraphData

  graphData.nodes = Array.isArray(graphData.nodes)
    ? graphData.nodes.map((node) => {
      const normalizedType = resolveNodeType(node)
      const label = typeof node.label === 'string' ? node.label : ''
      if (!node.text && label) {
        return {
          ...node,
          type: normalizedType,
          text: {
            value: label,
            x: node.x,
            y: node.y
          }
        }
      }
      return {
        ...node,
        type: normalizedType
      }
    })
    : []

  graphData.edges = Array.isArray(graphData.edges)
    ? graphData.edges.map((edge) => {
      const normalizedType = typeof edge.type === 'string' && builtinEdgeTypes.has(edge.type)
        ? edge.type
        : flowPolylineEdgeType
      const label = typeof edge.label === 'string' ? edge.label : ''
      if (!edge.text && label) {
        return {
          ...edge,
          type: normalizedType,
          text: {
            value: label
          }
        }
      }
      return {
        ...edge,
        type: normalizedType
      }
    })
    : []

  return graphData
}

function toLogicFlowGraphData(input?: SchemaGraphData | string | null) {
  return normalizeGraphData(input) as unknown as LogicFlowGraphData
}

function resolvePanelComponent(viewPath?: string) {
  const candidates = getViewCandidates(viewPath)
  const matched = candidates.find(candidate => panelModules[candidate])
  if (!matched) {
    return null
  }

  return markRaw(defineAsyncComponent(panelModules[matched] as any))
}

function resolveToolbarIcon(icon?: string | object) {
  if (!icon) {
    return null
  }

  return typeof icon === 'string' ? resolveDynamicComponent(icon) : icon
}

function isSaveButton(button: SchemaGraphToolbarButton) {
  return button.action === 'save' || button.key === 'save'
}

function selectGraph() {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return
  }

  textEditor.visible = false
  if (selectedElement.value?.id) {
    logicFlow.selectElementById(selectedElement.value.id)
    return
  }

  logicFlow.clearSelectElements()
}

function deleteSelected() {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return
  }

  const elements = logicFlow.getSelectElements(true)
  if ((elements.nodes || []).length === 0 && (elements.edges || []).length === 0) {
    const currentId = String(selectedElement.value?.id || '').trim()
    if (!currentId || isDeleteLocked(selectedElement.value)) {
      ElMessage.warning('请先选择节点或连线')
      return
    }
    ;(logicFlow as any).deleteElement?.(currentId)
  } else {
    const removableNodes = (elements.nodes || []).filter(node => !isDeleteLocked(node as SchemaGraphElementData))

    logicFlow.clearSelectElements()
    ;(elements.edges || []).forEach((edge) => {
      if (edge.id) {
        logicFlow.deleteEdge(edge.id)
      }
    })
    ;(removableNodes || []).forEach((node) => {
      if (node.id) {
        logicFlow.deleteNode(node.id)
      }
    })
  }

  panelState.visible = false
  selectedElement.value = null
  textEditor.visible = false
  syncNodeBadgeOverlay()
  emitGraphChange()
}

function removeEdgeById(edgeId: string) {
  const logicFlow = logicFlowRef.value
  const normalizedEdgeId = String(edgeId || '').trim()
  if (!logicFlow || !normalizedEdgeId) {
    return
  }

  logicFlow.deleteEdge(normalizedEdgeId)
  if (selectedElement.value?.id === normalizedEdgeId) {
    selectedElement.value = null
  }
  emitGraphChange()
}

function clearClickTimer() {
  if (clickTimer !== null) {
    window.clearTimeout(clickTimer)
    clickTimer = null
  }
}

function fitGraph() {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return
  }

  nextTick(() => {
    logicFlow.graphModel.resize()
    if ((logicFlow.getGraphRawData().nodes || []).length > 0) {
      logicFlow.graphModel.fitView(60, 60)
    }
  })
}

function resizeGraphCanvas() {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return
  }

  nextTick(() => {
    logicFlow.graphModel.resize()
    syncNodeBadgeOverlay()
  })
}

// 缩放按钮统一走内建能力，避免父层重复关心 LogicFlow 细节。
function zoomInGraph() {
  logicFlowRef.value?.zoom(true)
}

function zoomOutGraph() {
  logicFlowRef.value?.zoom(false)
}

// 将当前图形整体平移到画布中心，不改变缩放比例。
function centerGraph() {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return
  }

  logicFlow.graphModel.translateCenter()
}

// 将所有节点和连线整体适配进当前视口。
function focusGraph() {
  fitGraph()
}

function getFlowLayoutPriority(node: SchemaGraphElementData) {
  const systemNodeKey = String(getElementProperties(node).systemNodeKey || '').trim()
  if (systemNodeKey === 'start') {
    return -100
  }
  if (systemNodeKey === 'end') {
    return 100
  }
  if (systemNodeKey === 'drafter') {
    return -50
  }
  return 0
}

function isFlowArrangeGraph(nodes: SchemaGraphElementData[]) {
  return nodes.some((node) => {
    const systemNodeKey = String(getElementProperties(node).systemNodeKey || '').trim()
    return systemNodeKey === 'start' || systemNodeKey === 'end' || systemNodeKey === 'drafter'
  })
}

function resetArrangedEdgeGeometry(edge: SchemaGraphElementData): SchemaGraphElementData {
  const {
    points,
    pointsList,
    startPoint,
    endPoint,
    path,
    text: _text,
    ...restEdge
  } = edge as SchemaGraphElementData & {
    points?: string
    pointsList?: PolylinePoint[]
    startPoint?: PolylinePoint
    endPoint?: PolylinePoint
    path?: string
  }
  const label = getGraphLabel(edge)

  return label
    ? {
        ...restEdge,
        text: {
          value: label
        }
      }
    : restEdge
}

function buildFlowArrangedGraphData(graphData: SchemaGraphData, canvasWidth: number, canvasHeight: number): SchemaGraphData {
  const sortedNodes = [...(graphData.nodes || [])]
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const priorityDelta = getFlowLayoutPriority(left.item) - getFlowLayoutPriority(right.item)
      if (priorityDelta !== 0) {
        return priorityDelta
      }

      const xDelta = Number(left.item.x || 0) - Number(right.item.x || 0)
      if (xDelta !== 0) {
        return xDelta
      }

      const yDelta = Number(left.item.y || 0) - Number(right.item.y || 0)
      if (yDelta !== 0) {
        return yDelta
      }

      return left.index - right.index
    })
    .map(entry => entry.item)

  const startX = 280
  const centerY = Math.max(110, Math.round(canvasHeight / 2))
  const gapX = sortedNodes.length > 1
    ? Math.max(220, Math.round((Math.max(canvasWidth - 420, 220)) / Math.max(sortedNodes.length - 1, 1)))
    : 0
  const nextNodes = sortedNodes.map((node, index) => ({
    ...node,
    x: startX + index * gapX,
    y: centerY,
    text: {
      ...(node.text || {}),
      value: getGraphLabel(node),
      x: startX + index * gapX,
      y: centerY
    }
  }))

  return {
    ...graphData,
    nodes: nextNodes,
    edges: (graphData.edges || []).map((edge) => ({
      ...resetArrangedEdgeGeometry(edge),
      sourceAnchorId: `${String(edge.sourceNodeId || '').trim()}_1`,
      targetAnchorId: `${String(edge.targetNodeId || '').trim()}_3`
    }))
  }
}

// 自动排列会把节点按当前顺序整理成网格，便于快速对齐查看关系。
function arrangeNodes() {
  const logicFlow = logicFlowRef.value
  const canvas = canvasRef.value
  if (!logicFlow || !canvas) {
    return
  }

  const graphData = logicFlow.getGraphRawData() as SchemaGraphData
  const rect = canvas.getBoundingClientRect()

  if (isFlowArrangeGraph(graphData.nodes || [])) {
    const nextGraphData = buildFlowArrangedGraphData(graphData, rect.width, rect.height)
    suspendMutationCallbacks = true
    try {
      logicFlow.renderRawData(nextGraphData as unknown as LogicFlowGraphData)
    } finally {
      suspendMutationCallbacks = false
    }
    syncGraphText(nextGraphData)
    applyNodeConnectRules()
    nextTick(() => {
      ;(nextGraphData.edges || []).forEach((edge) => {
        logicFlow.getEdgeModelById(edge.id)?.resetTextPosition()
      })
      emitGraphChange()
      focusGraph()
    })
    return
  }

  const nodes = [...(graphData.nodes || [])].sort((left, right) => {
    const deltaX = Number(left.x || 0) - Number(right.x || 0)
    if (deltaX !== 0) {
      return deltaX
    }
    return Number(left.y || 0) - Number(right.y || 0)
  })

  if (nodes.length === 0) {
    return
  }

  const maxNodeWidth = nodes.reduce((maxWidth, node) => {
    return Math.max(maxWidth, getCurrentNodeSize(logicFlow, node).width)
  }, defaultNodeWidth)
  const maxNodeHeight = nodes.reduce((maxHeight, node) => {
    return Math.max(maxHeight, getCurrentNodeSize(logicFlow, node).height)
  }, defaultNodeHeight)
  const gapX = Math.max(220, Math.ceil(maxNodeWidth + 44))
  const gapY = Math.max(140, Math.ceil(maxNodeHeight + 28))
  const startX = Math.max(160, Math.ceil(maxNodeWidth / 2) + 54)
  const startY = Math.max(110, Math.ceil(maxNodeHeight / 2) + 38)
  const availableWidth = Math.max(rect.width - startX * 2, 0)
  const columns = Math.max(1, Math.floor(availableWidth / gapX) + 1)

  nodes.forEach((node, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    // 通过 GraphModel 统一更新节点坐标，确保关联连线锚点同步刷新。
    logicFlow.graphModel.moveNode2Coordinate(
      node.id,
      startX + column * gapX,
      startY + row * gapY,
      true
    )
  })

  // 自动排列后重置连线文字位置，避免文本仍停留在排列前的坐标。
  ;(graphData.edges || []).forEach((edge) => {
    logicFlow.getEdgeModelById(edge.id)?.resetTextPosition()
  })

  syncNodeBadgeOverlay()

  nextTick(() => {
    emitGraphChange()
    focusGraph()
  })
}

function getTemplateNodeSize(template?: SchemaGraphNodeTemplate | null) {
  const width = Number(template?.width || defaultNodeWidth)
  const height = Number(template?.height || defaultNodeHeight)

  return {
    width: width > 0 ? width : defaultNodeWidth,
    height: height > 0 ? height : defaultNodeHeight
  }
}

function getCurrentNodeSize(logicFlow: LogicFlow, nodeData?: SchemaGraphElementData | null) {
  const nodeId = String(nodeData?.id || '').trim()
  const nodeModel = nodeId ? logicFlow.getNodeModelById(nodeId) as any : null

  return {
    width: Number(nodeModel?.width || nodeData?.width || defaultNodeWidth),
    height: Number(nodeModel?.height || nodeData?.height || defaultNodeHeight)
  }
}

function isNodePositionOverlapping(logicFlow: LogicFlow, position: { x: number; y: number }, size: { width: number; height: number }, nodes: SchemaGraphElementData[]) {
  return nodes.some((node) => {
    const currentPosition = getNodePosition(logicFlow, node)
    const currentSize = getCurrentNodeSize(logicFlow, node)

    return Math.abs(position.x - currentPosition.x) < (size.width + currentSize.width) / 2 + nodePlacementGap
      && Math.abs(position.y - currentPosition.y) < (size.height + currentSize.height) / 2 + nodePlacementGap
  })
}

function toCanvasOverlayPosition(logicFlow: LogicFlow, clientX: number, clientY: number) {
  return logicFlow.getPointByClient(clientX, clientY).canvasOverlayPosition
}

function findAvailableNodePosition(template: SchemaGraphNodeTemplate) {
  const logicFlow = logicFlowRef.value
  const canvas = canvasRef.value
  const size = getTemplateNodeSize(template)

  if (!logicFlow || !canvas) {
    return {
      x: 280,
      y: 140
    }
  }

  const graphData = logicFlow.getGraphRawData() as SchemaGraphData
  const nodes = graphData.nodes || []
  const rect = canvas.getBoundingClientRect()
  const minLocalX = size.width / 2 + nodePlacementPadding
  const maxLocalX = Math.max(minLocalX, rect.width - size.width / 2 - nodePlacementPadding)
  const minLocalY = Math.max(size.height / 2 + nodePlacementPadding, nodePlacementTopPadding)
  const maxLocalY = Math.max(minLocalY, rect.height - size.height / 2 - nodePlacementPadding)
  const stepX = Math.max(size.width + nodePlacementGap * 2, 180)
  const stepY = Math.max(size.height + nodePlacementGap * 2, 120)

  for (let localY = minLocalY; localY <= maxLocalY + 0.01; localY += stepY) {
    for (let localX = minLocalX; localX <= maxLocalX + 0.01; localX += stepX) {
      const candidate = toCanvasOverlayPosition(logicFlow, rect.left + localX, rect.top + localY)
      if (!isNodePositionOverlapping(logicFlow, candidate, size, nodes)) {
        return candidate
      }
    }
  }

  const center = toCanvasOverlayPosition(
    logicFlow,
    rect.left + rect.width / 2,
    rect.top + Math.max(rect.height / 2, nodePlacementTopPadding)
  )
  const maxRadius = Math.max(6, Math.ceil(Math.sqrt(nodes.length + 1)))

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        if (Math.max(Math.abs(offsetX), Math.abs(offsetY)) !== radius) {
          continue
        }

        const candidate = {
          x: center.x + offsetX * stepX,
          y: center.y + offsetY * stepY
        }

        if (!isNodePositionOverlapping(logicFlow, candidate, size, nodes)) {
          return candidate
        }
      }
    }
  }

  return {
    x: center.x + stepX,
    y: center.y
  }
}

function addNode(template?: SchemaGraphNodeTemplate) {
  const logicFlow = logicFlowRef.value
  const targetTemplate = template || props.nodeTemplates[0]

  if (!logicFlow || props.readonly || !targetTemplate) {
    return null
  }

  const size = getTemplateNodeSize(targetTemplate)
  const position = findAvailableNodePosition(targetTemplate)
  const nodeModel = logicFlow.addNode({
    type: targetTemplate.type,
    x: position.x,
    y: position.y,
    text: {
      value: targetTemplate.label,
      x: position.x,
      y: position.y
    },
    properties: targetTemplate.properties ? { ...targetTemplate.properties } : undefined,
    width: size.width,
    height: size.height
  })
  const nodeData = nodeModel.getData() as SchemaGraphElementData

  applyNodeConnectRules()
  selectedElement.value = enrichElementData(nodeData)
  textEditor.visible = false
  logicFlow.clearSelectElements()
  logicFlow.selectElementById(nodeData.id)
  syncNodeBadgeOverlay()
  emitGraphChange()

  return selectedElement.value
}

function clampNodeToCanvas(nodeData: SchemaGraphElementData) {
  if (!props.constrainNodeInCanvas) {
    return
  }

  const logicFlow = logicFlowRef.value
  const canvas = canvasRef.value
  if (!logicFlow || !canvas) {
    return
  }

  const nodeModel = logicFlow.getNodeModelById(nodeData.id)
  if (!nodeModel) {
    return
  }

  const canvasRect = canvas.getBoundingClientRect()
  const nodeWidth = Number((nodeModel as any).width || 120)
  const nodeHeight = Number((nodeModel as any).height || 56)
  const halfWidth = nodeWidth / 2
  const halfHeight = nodeHeight / 2
  const nextX = Math.min(Math.max(Number(nodeData.x || 0), halfWidth), Math.max(canvasRect.width - halfWidth, halfWidth))
  const nextY = Math.min(Math.max(Number(nodeData.y || 0), halfHeight), Math.max(canvasRect.height - halfHeight, halfHeight))

  nodeModel.moveTo(nextX, nextY, true)
}

function getNodePosition(logicFlow: LogicFlow, nodeData?: SchemaGraphElementData | null) {
  const nodeId = String(nodeData?.id || '').trim()
  const nodeModel = nodeId ? logicFlow.getNodeModelById(nodeId) as any : null

  return {
    x: Number(nodeModel?.x ?? nodeData?.x ?? 0),
    y: Number(nodeModel?.y ?? nodeData?.y ?? 0)
  }
}

function syncAdjustedPolylineTextPosition(logicFlow: LogicFlow, edgeModel: any) {
  const text = edgeModel?.text
  if (!text?.value) {
    return
  }

  ;(logicFlow as any).graphModel?.handleEdgeTextMove?.(edgeModel, text.x, text.y)
}

function applyAdjustedPolylinePoints(logicFlow: LogicFlow, edgeModel: any, pointsList: PolylinePoint[]) {
  if (!Array.isArray(pointsList) || pointsList.length < 2) {
    return
  }

  edgeModel.startPoint = {
    x: pointsList[0].x,
    y: pointsList[0].y
  }
  edgeModel.endPoint = {
    x: pointsList[pointsList.length - 1].x,
    y: pointsList[pointsList.length - 1].y
  }
  edgeModel.updatePath(pointsList)
  syncAdjustedPolylineTextPosition(logicFlow, edgeModel)
}

function createNodeDragAdjustedEdgeSnapshot(logicFlow: LogicFlow, nodeData?: SchemaGraphElementData | null) {
  if (!props.constrainNodeInCanvas) {
    return null
  }

  const nodeId = String(nodeData?.id || '').trim()
  if (!nodeId) {
    return null
  }

  const graphData = logicFlow.getGraphRawData() as SchemaGraphData
  const edges = (graphData.edges || []).reduce((result, edge) => {
    const sourceNodeId = String(edge.sourceNodeId || '').trim()
    const targetNodeId = String(edge.targetNodeId || '').trim()
    if (sourceNodeId !== nodeId && targetNodeId !== nodeId) {
      return result
    }

    const edgeModel = logicFlow.getEdgeModelById(edge.id) as any
    if (!edgeModel || !hasAdjustedPolylinePath(edgeModel)) {
      return result
    }

    const movedSide: AdjustedPolylineMovedSide = sourceNodeId === nodeId && targetNodeId === nodeId
      ? 'both'
      : sourceNodeId === nodeId
        ? 'start'
        : 'end'

    result.push({
      edgeId: edge.id,
      movedSide,
      pointsList: clonePolylinePoints(edgeModel.pointsList)
    })

    return result
  }, [] as NodeDragAdjustedEdgeSnapshot[])

  if (edges.length === 0) {
    return null
  }

  const position = getNodePosition(logicFlow, nodeData)
  return {
    nodeId,
    startX: position.x,
    startY: position.y,
    edges
  }
}

function syncNodeDragAdjustedEdges(logicFlow: LogicFlow, nodeData?: SchemaGraphElementData | null) {
  const nodeId = String(nodeData?.id || '').trim()
  if (!activeNodeDragSnapshot || !nodeId || activeNodeDragSnapshot.nodeId !== nodeId) {
    return
  }

  const position = getNodePosition(logicFlow, nodeData)
  const deltaX = position.x - activeNodeDragSnapshot.startX
  const deltaY = position.y - activeNodeDragSnapshot.startY
  if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) {
    return
  }

  activeNodeDragSnapshot.edges.forEach((snapshot) => {
    const edgeModel = logicFlow.getEdgeModelById(snapshot.edgeId) as any
    if (!edgeModel) {
      return
    }

    const nextPoints = buildAdjustedPolylinePoints(snapshot.pointsList, deltaX, deltaY, snapshot.movedSide)
    if (!nextPoints) {
      return
    }

    applyAdjustedPolylinePoints(logicFlow, edgeModel, nextPoints)
  })
}

function clearNodeDragAdjustedEdgeSnapshot(nodeId?: string) {
  if (!activeNodeDragSnapshot) {
    return
  }

  if (!nodeId || activeNodeDragSnapshot.nodeId === String(nodeId || '').trim()) {
    activeNodeDragSnapshot = null
  }
}

function didNodeDragMove(data: any) {
  if (!activeNodeDragSnapshot) {
    return false
  }

  const currentNodeId = String(data?.id || '').trim()
  if (currentNodeId && currentNodeId !== activeNodeDragSnapshot.nodeId) {
    return false
  }

  const currentX = Number(data?.x)
  const currentY = Number(data?.y)
  if (!Number.isFinite(currentX) || !Number.isFinite(currentY)) {
    return false
  }

  return Math.abs(currentX - activeNodeDragSnapshot.startX) > 0.01
    || Math.abs(currentY - activeNodeDragSnapshot.startY) > 0.01
}

function updatePanelTitle(payload: SchemaGraphPayload) {
  if (props.dialogTitleResolver) {
    panelState.title = props.dialogTitleResolver(payload)
    return
  }

  panelState.title = payload.type === 'node' ? '节点属性' : '连线属性'
}

function openPanel(type: 'node' | 'edge', current: SchemaGraphElementData) {
  const viewPath = type === 'node' ? props.nodePanelPath : props.edgePanelPath
  if (!viewPath) {
    return
  }

  const component = resolvePanelComponent(viewPath)
  const payload: SchemaGraphPayload = {
    type,
    current: enrichElementData(current),
    graphData: saveGraph()
  }

  panelState.component = component
  panelState.payload = payload
  selectedElement.value = payload.current
  updatePanelTitle(payload)
  panelState.visible = true
}

function queuePanelOpen(type: 'node' | 'edge', current: SchemaGraphElementData) {
  if (isPanelDisabled(current)) {
    return
  }

  clearClickTimer()
  clickTimer = window.setTimeout(() => {
    openPanel(type, current)
    clickTimer = null
  }, clickDelay)
}

function openTextEditor(type: 'node' | 'edge', current: SchemaGraphElementData, event?: MouseEvent) {
  if (props.readonly || !surfaceRef.value || !event || isTextLocked(current)) {
    return
  }

  const rect = surfaceRef.value.getBoundingClientRect()
  textEditor.visible = true
  textEditor.targetId = current.id
  textEditor.targetType = type
  textEditor.value = getGraphLabel(current)
  textEditor.left = event.clientX - rect.left
  textEditor.top = event.clientY - rect.top

  nextTick(() => {
    textEditorInputRef.value?.focus()
    textEditorInputRef.value?.select()
  })
}

function commitTextEdit() {
  const logicFlow = logicFlowRef.value
  if (!logicFlow || !textEditor.targetId) {
    textEditor.visible = false
    return
  }

  const graphData = logicFlow.getGraphRawData() as SchemaGraphData
  const target = [...(graphData.nodes || []), ...(graphData.edges || [])]
    .find(item => String(item.id || '').trim() === textEditor.targetId)

  if (isTextLocked(target)) {
    textEditor.visible = false
    textEditor.targetId = ''
    return
  }

  logicFlow.updateText(textEditor.targetId, textEditor.value)
  textEditor.visible = false
  textEditor.targetId = ''
  emitGraphChange()
}

function handleBadgeNodeClick(nodeId: string) {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return
  }

  const normalizedNodeId = String(nodeId || '').trim()
  if (!normalizedNodeId) {
    return
  }

  const currentNode = ((logicFlow.getGraphRawData() as SchemaGraphData).nodes || [])
    .find((item) => String(item.id || '').trim() === normalizedNodeId)

  if (currentNode) {
    selectedElement.value = enrichElementData(currentNode)
  }

  logicFlow.clearSelectElements()
  logicFlow.selectElementById(normalizedNodeId)
}

function applyNodeConnectRules() {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return
  }

  const graphData = logicFlow.getGraphRawData() as SchemaGraphData
  ;(graphData.nodes || []).forEach((node) => {
    const nodeModel = logicFlow.getNodeModelById(node.id) as any
    if (!nodeModel) {
      return
    }

    const properties = getElementProperties(node)
    const allowIncoming = properties.allowIncoming !== false
    const allowOutgoing = properties.allowOutgoing !== false

    nodeModel.targetRules = allowIncoming ? [] : [createDenyConnectRule()]
    nodeModel.sourceRules = allowOutgoing ? [] : [createDenyConnectRule()]
    nodeModel.hasSetTargetRules = true
    nodeModel.hasSetSourceRules = true
  })
}

function createImageElement(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('failed to load graph image source'))
    image.src = source
  })
}

async function exportGraphImage() {
  const canvas = canvasRef.value
  if (!canvas) {
    return ''
  }

  const svg = canvas.querySelector('svg') as SVGSVGElement | null
  if (!svg) {
    return ''
  }

  const rect = svg.getBoundingClientRect()
  const width = Math.max(1, Math.ceil(rect.width || canvas.clientWidth || 1))
  const height = Math.max(1, Math.ceil(rect.height || canvas.clientHeight || 1))
  const clonedSvg = svg.cloneNode(true) as SVGSVGElement

  if (!clonedSvg.getAttribute('xmlns')) {
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }
  if (!clonedSvg.getAttribute('xmlns:xlink')) {
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  }

  clonedSvg.setAttribute('width', String(width))
  clonedSvg.setAttribute('height', String(height))
  if (!clonedSvg.getAttribute('viewBox')) {
    clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }

  const serializedSvg = new XMLSerializer().serializeToString(clonedSvg)
  const svgSource = serializedSvg.startsWith('<?xml')
    ? serializedSvg
    : `<?xml version="1.0" standalone="no"?>\n${serializedSvg}`
  const imageSource = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgSource)}`
  const image = await createImageElement(imageSource)
  const exportCanvas = document.createElement('canvas')

  exportCanvas.width = width
  exportCanvas.height = height

  const context = exportCanvas.getContext('2d')
  if (!context) {
    return ''
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  return exportCanvas.toDataURL('image/png')
}

function handlePanelClosed() {
  panelState.component = null
  panelState.payload = null
  panelState.title = '属性配置'
}

function bindGraphEvents(logicFlow: LogicFlow) {
  logicFlow.on('graph:transform', () => {
    syncNodeBadgeOverlay()
  })

  logicFlow.on('graph:rendered', () => {
    syncNodeBadgeOverlay()
  })

  logicFlow.on('node:add', () => {
    syncNodeBadgeOverlay()
    emitGraphChange()
  })

  logicFlow.on('node:delete', () => {
    syncNodeBadgeOverlay()
    emitGraphChange()
  })

  logicFlow.on('edge:delete', () => {
    emitGraphChange()
  })

  logicFlow.on('node:click', ({ data }: any) => {
    if (shouldSuppressDraggedNodeClick(data?.id)) {
      suppressNodeClickUntil = 0
      suppressNodeClickNodeId = ''
      selectedElement.value = enrichElementData(data)
      return
    }

    selectedElement.value = enrichElementData(data)
    queuePanelOpen('node', data)
    if (props.onNodeClick) {
      props.onNodeClick({
        type: 'node',
        current: enrichElementData(data),
        graphData: saveGraph()
      })
    }
  })

  logicFlow.on('edge:click', ({ data }: any) => {
    selectedElement.value = enrichElementData(data)
    queuePanelOpen('edge', data)
    if (props.onEdgeClick) {
      props.onEdgeClick({
        type: 'edge',
        current: enrichElementData(data),
        graphData: saveGraph()
      })
    }
  })

  logicFlow.on('edge:add', async ({ data }: any) => {
    if (suspendMutationCallbacks) {
      return
    }

    const nextEdge = enrichElementData(data)
    selectedElement.value = nextEdge

    if (!props.onEdgeAdd) {
      emitGraphChange()
      return
    }

    try {
      const result = await props.onEdgeAdd({
        edge: nextEdge,
        graphData: saveGraph(),
        patchEdge,
        removeEdge: removeEdgeById
      })

      if (result === false || (typeof result === 'object' && result?.cancel)) {
        removeEdgeById(nextEdge.id)
        return
      }

      if (result && typeof result === 'object') {
        patchEdge({
          edgeId: nextEdge.id,
          nextEdgeId: typeof result.nextEdgeId === 'string' ? result.nextEdgeId : undefined,
          label: typeof result.label === 'string' ? result.label : undefined,
          properties: result.properties
        })
        return
      }

      emitGraphChange()
    } catch (error) {
      console.error('处理新连线失败:', error)
      removeEdgeById(nextEdge.id)
      ElMessage.error('创建连线失败')
    }
  })

  // 双击进入原位编辑，失焦后提交文字。
  logicFlow.on('node:dbclick', ({ data, e }: any) => {
    clearClickTimer()
    openTextEditor('node', data, e)
  })

  logicFlow.on('edge:dbclick', ({ data, e }: any) => {
    clearClickTimer()
    openTextEditor('edge', data, e)
  })

  logicFlow.on('node:dragstart', ({ data }: any) => {
    clearClickTimer()
    suppressNodeClickUntil = 0
    suppressNodeClickNodeId = String(data?.id || '').trim()
    activeNodeDragSnapshot = createNodeDragAdjustedEdgeSnapshot(logicFlow, data)
  })

  logicFlow.on('node:drag', ({ data }: any) => {
    syncNodeDragAdjustedEdges(logicFlow, data)
    syncNodeBadgeOverlay()
  })

  // 节点拖拽结束后强制回到容器边界内。
  logicFlow.on('node:drop', ({ data }: any) => {
    const moved = didNodeDragMove(data)
    clampNodeToCanvas(data)
    syncNodeDragAdjustedEdges(logicFlow, data)
    clearNodeDragAdjustedEdgeSnapshot(data?.id)
    syncNodeBadgeOverlay()
    clearClickTimer()
    if (moved) {
      suppressDraggedNodeClick(data?.id)
    } else {
      suppressNodeClickUntil = 0
      suppressNodeClickNodeId = ''
    }
    nextTick(() => {
      scheduleGraphChange()
    })
  })
}

function createLogicFlow() {
  if (!canvasRef.value) {
    return
  }

  const logicFlow = new LogicFlow({
    container: canvasRef.value,
    grid: {
      size: 10,
      visible: true,
      type: 'dot'
    },
    stopScrollGraph: false,
    stopZoomGraph: false,
    textEdit: false,
    nodeTextEdit: false,
    edgeTextEdit: false,
    hoverOutline: true,
    background: {
      backgroundColor: '#fbfcfe'
    }
  })

  logicFlow.register({
    type: dataModelNodeType,
    view: DataModelRectNode as any,
    model: DataModelRectNodeModel as any
  })

  logicFlow.register({
    type: flowPolylineEdgeType,
    view: FlowSubmitTypeEdge as any,
    model: FlowPolylineEdgeModel as any
  })

  logicFlow.setDefaultEdgeType(flowPolylineEdgeType)
  logicFlow.updateEditConfig({
    adjustEdge: true,
    adjustEdgeStartAndEnd: true,
    nodeTextEdit: false,
    edgeTextEdit: false,
    textEdit: false,
    nodeSelectedOutline: true,
    edgeSelectedOutline: true,
    stopMoveGraph: false
  })

  logicFlow.setTheme({
    rect: {
      radius: 8,
      stroke: '#1f2937',
      strokeWidth: 1.4,
      fill: '#ffffff'
    },
    nodeText: {
      color: '#111827',
      fontSize: 14
    },
    edgeText: {
      color: '#374151',
      fontSize: 13,
      background: {
        fill: '#ffffff'
      }
    },
    polyline: {
      stroke: '#2563eb',
      strokeWidth: 1.5
    },
    arrow: {
      offset: 12,
      verticalLength: 4,
      refX: 8,
      fill: '#2563eb',
      stroke: '#2563eb'
    }
  } as any)

  const initialGraphData = toLogicFlowGraphData(props.initialData)
  suspendMutationCallbacks = true
  try {
    logicFlow.renderRawData(initialGraphData)
  } finally {
    suspendMutationCallbacks = false
  }
  bindGraphEvents(logicFlow)
  logicFlowRef.value = logicFlow
  selectedElement.value = null
  applyNodeConnectRules()
  syncNodeBadgeOverlay()
  if ((initialGraphData as any).autoGenerated) {
    fitGraph()
    return
  }

  resizeGraphCanvas()
}

function saveGraph() {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return { nodes: [], edges: [] }
  }

  const rawData = logicFlow.getGraphRawData() as SchemaGraphData
  return {
    ...rawData,
    autoGenerated: false,
    nodes: (rawData.nodes || []).map(node => enrichElementData(node)),
    edges: (rawData.edges || []).map(edge => enrichElementData(edge))
  }
}

function normalizeComparableGraphValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => normalizeComparableGraphValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce((result, key) => {
        ;(result as Record<string, unknown>)[key] = normalizeComparableGraphValue((value as Record<string, unknown>)[key])
        return result
      }, {} as Record<string, unknown>)
  }

  return value
}

function buildGraphSignature(data: SchemaGraphData | string) {
  return JSON.stringify(buildComparableGraphSnapshot(data))
}

function buildComparableGraphSnapshot(data: SchemaGraphData | string) {
  const graphData = toLogicFlowGraphData(data) as SchemaGraphData
  const compareById = (left: SchemaGraphElementData, right: SchemaGraphElementData) => {
    return String(left.id || '').localeCompare(String(right.id || ''))
  }

  return normalizeComparableGraphValue({
    nodes: [...(graphData.nodes || [])]
      .map(item => ({
        id: String(item.id || '').trim(),
        type: resolveNodeType(item),
        x: Number(item.x || 0),
        y: Number(item.y || 0),
        width: Number(item.width || 0),
        height: Number(item.height || 0),
        label: getGraphLabel(item),
        properties: getElementProperties(item)
      }) as SchemaGraphElementData)
      .sort(compareById),
    edges: [...(graphData.edges || [])]
      .map(item => ({
        id: String(item.id || '').trim(),
        type: typeof item.type === 'string' ? item.type : flowPolylineEdgeType,
        sourceNodeId: String(item.sourceNodeId || '').trim(),
        targetNodeId: String(item.targetNodeId || '').trim(),
        label: getGraphLabel(item),
        properties: getElementProperties(item)
      }) as SchemaGraphElementData)
      .sort(compareById)
  })
}

function isCurrentGraphEquivalent(data: SchemaGraphData | string) {
  if (!logicFlowRef.value) {
    return false
  }

  return buildGraphSignature(saveGraph()) === buildGraphSignature(data)
}

function buildGraphStructureSignature(data: SchemaGraphData | string) {
  const graphData = toLogicFlowGraphData(data) as SchemaGraphData
  const compareById = (left: SchemaGraphElementData, right: SchemaGraphElementData) => {
    return String(left.id || '').localeCompare(String(right.id || ''))
  }

  return JSON.stringify(normalizeComparableGraphValue({
    nodes: [...(graphData.nodes || [])]
      .map(item => ({
        id: String(item.id || '').trim(),
        type: resolveNodeType(item)
      }) as SchemaGraphElementData)
      .sort(compareById),
    edges: [...(graphData.edges || [])]
      .map(item => ({
        id: String(item.id || '').trim(),
        type: typeof item.type === 'string' ? item.type : flowPolylineEdgeType,
        sourceNodeId: String(item.sourceNodeId || '').trim(),
        targetNodeId: String(item.targetNodeId || '').trim()
      }) as SchemaGraphElementData)
      .sort(compareById)
  }))
}

function isCurrentGraphStructureEquivalent(data: SchemaGraphData | string) {
  if (!logicFlowRef.value) {
    return false
  }

  return buildGraphStructureSignature(saveGraph()) === buildGraphStructureSignature(data)
}

function syncGraphDataInPlace(data: SchemaGraphData | string, options: {
  reconcileStructure?: boolean
  markAsHandled?: boolean
} = {}) {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return
  }

  const graphData = toLogicFlowGraphData(data) as SchemaGraphData
  const targetNodeIds = new Set((graphData.nodes || []).map((item) => String(item.id || '').trim()).filter(Boolean))
  const targetEdgeIds = new Set((graphData.edges || []).map((item) => String(item.id || '').trim()).filter(Boolean))
  suspendMutationCallbacks = true
  try {
    if (options.reconcileStructure) {
      const currentGraph = logicFlow.getGraphRawData() as SchemaGraphData
      ;(currentGraph.edges || []).forEach((edge) => {
        const edgeId = String(edge.id || '').trim()
        if (edgeId && !targetEdgeIds.has(edgeId)) {
          logicFlow.deleteEdge(edgeId)
        }
      })

      ;(currentGraph.nodes || []).forEach((node) => {
        const nodeId = String(node.id || '').trim()
        if (nodeId && !targetNodeIds.has(nodeId)) {
          logicFlow.deleteNode(nodeId)
        }
      })
    }

    ;(graphData.nodes || []).forEach((node) => {
      const nodeId = String(node.id || '').trim()
      if (!nodeId) {
        return
      }

      const nodeModel = logicFlow.getNodeModelById(nodeId) as any
      if (!nodeModel) {
        return
      }

      const nextX = Number(node.x || 0)
      const nextY = Number(node.y || 0)
      const currentX = Number(nodeModel.x || 0)
      const currentY = Number(nodeModel.y || 0)
      if (Number.isFinite(nextX) && Number.isFinite(nextY) && (Math.abs(currentX - nextX) > 0.01 || Math.abs(currentY - nextY) > 0.01)) {
        nodeModel.moveTo(nextX, nextY, true)
      }

      const label = getGraphLabel(node)
      if (label) {
        logicFlow.updateText(nodeId, label)
      }

      const properties = getElementProperties(node)
      if (Object.keys(properties).length > 0) {
        logicFlow.setProperties(nodeId, properties)
      }
    })

    ;(graphData.edges || []).forEach((edge) => {
      const edgeId = String(edge.id || '').trim()
      if (!edgeId) {
        return
      }

      const label = getGraphLabel(edge)
      if (label) {
        logicFlow.updateText(edgeId, label)
      }

      const properties = getElementProperties(edge)
      if (Object.keys(properties).length > 0) {
        logicFlow.setProperties(edgeId, properties)
      }
    })
  } finally {
    suspendMutationCallbacks = false
  }

  if (selectedElement.value?.id && !targetNodeIds.has(String(selectedElement.value.id || '').trim()) && !targetEdgeIds.has(String(selectedElement.value.id || '').trim())) {
    selectedElement.value = null
    panelState.visible = false
    textEditor.visible = false
  }

  if (options.markAsHandled) {
    lastEmittedGraphSignature = buildGraphSignature(graphData)
  }

  applyNodeConnectRules()
  syncNodeBadgeOverlay()
}

function syncExternalGraphDataInPlace(data: SchemaGraphData | string) {
  syncGraphDataInPlace(data, {
    reconcileStructure: true,
    markAsHandled: true
  })
}

function syncGraphText(graphData: SchemaGraphData) {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return
  }

  ;(graphData.nodes || []).forEach((node) => {
    const label = getGraphLabel(node)
    if (!label) {
      return
    }
    logicFlow.updateText(node.id, label)
  })

  ;(graphData.edges || []).forEach((edge) => {
    const label = getGraphLabel(edge)
    if (!label) {
      return
    }
    logicFlow.updateText(edge.id, label)
  })
}

function loadGraph(data: SchemaGraphData | string) {
  const logicFlow = logicFlowRef.value
  if (!logicFlow) {
    return
  }

  clearNodeDragAdjustedEdgeSnapshot()
  const graphData = toLogicFlowGraphData(data)
  suspendMutationCallbacks = true
  try {
    logicFlow.renderRawData(graphData)
  } finally {
    suspendMutationCallbacks = false
  }
  syncGraphText(graphData as unknown as SchemaGraphData)
  applyNodeConnectRules()
  syncNodeBadgeOverlay()
  panelState.visible = false
  selectedElement.value = null

  if ((graphData as any).autoGenerated) {
    nextTick(() => {
      arrangeNodes()
    })
    return
  }

  resizeGraphCanvas()
}

function patchNode(payload: {
  nodeId: string
  nextNodeId?: string
  label?: string
  properties?: SchemaGraphElementProperties
}) {
  const logicFlow = logicFlowRef.value
  const currentNodeId = String(payload.nodeId || '').trim()
  const requestedNextNodeId = String(payload.nextNodeId || '').trim()
  if (!logicFlow || !currentNodeId) {
    return
  }

  let effectiveNodeId = currentNodeId
  if (requestedNextNodeId && requestedNextNodeId !== currentNodeId) {
    effectiveNodeId = logicFlow.changeNodeId(currentNodeId, requestedNextNodeId)
  }

  if (typeof payload.label === 'string') {
    logicFlow.updateText(effectiveNodeId, payload.label)
  }

  if (payload.properties && Object.keys(payload.properties).length > 0) {
    logicFlow.setProperties(effectiveNodeId, payload.properties)
  }

  syncNodeBadgeOverlay()

  const nextNode = enrichElementData(logicFlow.getNodeDataById(effectiveNodeId) as SchemaGraphElementData)
  if (!nextNode.id) {
    return
  }

  if (selectedElement.value?.id === currentNodeId || selectedElement.value?.id === effectiveNodeId) {
    selectedElement.value = nextNode
  }

  if (panelState.payload?.type === 'node' && (panelState.payload.current.id === currentNodeId || panelState.payload.current.id === effectiveNodeId)) {
    const nextPayload: SchemaGraphPayload = {
      ...panelState.payload,
      current: nextNode,
      graphData: saveGraph()
    }
    panelState.payload = nextPayload
    updatePanelTitle(nextPayload)
  }

  emitGraphChange()
}

function patchEdge(payload: {
  edgeId: string
  nextEdgeId?: string
  label?: string
  properties?: SchemaGraphElementProperties
}) {
  const logicFlow = logicFlowRef.value
  const currentEdgeId = String(payload.edgeId || '').trim()
  const requestedNextEdgeId = String(payload.nextEdgeId || '').trim()
  if (!logicFlow || !currentEdgeId) {
    return
  }

  let effectiveEdgeId = currentEdgeId
  if (requestedNextEdgeId && requestedNextEdgeId !== currentEdgeId) {
    effectiveEdgeId = logicFlow.changeEdgeId(currentEdgeId, requestedNextEdgeId)
  }

  if (typeof payload.label === 'string') {
    logicFlow.updateText(effectiveEdgeId, payload.label)
  }

  if (payload.properties && Object.keys(payload.properties).length > 0) {
    logicFlow.setProperties(effectiveEdgeId, payload.properties)
  }

  const nextEdge = enrichElementData(logicFlow.getEdgeDataById(effectiveEdgeId) as SchemaGraphElementData)
  if (!nextEdge.id) {
    return
  }

  if (selectedElement.value?.id === currentEdgeId || selectedElement.value?.id === effectiveEdgeId) {
    selectedElement.value = nextEdge
  }

  if (panelState.payload?.type === 'edge' && (panelState.payload.current.id === currentEdgeId || panelState.payload.current.id === effectiveEdgeId)) {
    const nextPayload: SchemaGraphPayload = {
      ...panelState.payload,
      current: nextEdge,
      graphData: saveGraph()
    }
    panelState.payload = nextPayload
    updatePanelTitle(nextPayload)
  }

  emitGraphChange()
}

async function handleToolbarClick(button: SchemaGraphToolbarButton) {
  const payload: SchemaGraphToolbarClickPayload = {
    graphData: saveGraph(),
    selectedElement: selectedElement.value,
    addNode,
    saveGraph,
    loadGraph,
    selectGraph,
    deleteSelected,
    zoomIn: zoomInGraph,
    zoomOut: zoomOutGraph,
    centerGraph,
    focusGraph,
    arrangeNodes
  }

  if (button.action === 'delete' && button.onClick) {
    await button.onClick(payload)
    return
  }

  if (button.action === 'select') {
    selectGraph()
  }

  if (button.action === 'addNode') {
    payload.selectedElement = addNode()
    payload.graphData = saveGraph()
  }

  if (button.action === 'delete') {
    deleteSelected()
  }

  if (button.action === 'zoomIn') {
    zoomInGraph()
  }

  if (button.action === 'zoomOut') {
    zoomOutGraph()
  }

  if (button.action === 'center') {
    centerGraph()
  }

  if (button.action === 'focusAll') {
    focusGraph()
  }

  if (button.action === 'arrange') {
    arrangeNodes()
  }

  if (isSaveButton(button)) {
    payload.result = payload.graphData
  }

  await button.onClick?.(payload)
}

watch(
  () => props.initialData,
  (value) => {
    if (!logicFlowRef.value) {
      return
    }

    if (!value) {
      lastEmittedGraphSignature = ''
      loadGraph({ nodes: [], edges: [] })
      return
    }

    const nextSignature = buildGraphSignature(value)
    if (nextSignature && nextSignature === lastEmittedGraphSignature) {
      return
    }

    if (isCurrentGraphEquivalent(value)) {
      return
    }

    if (isCurrentGraphStructureEquivalent(value)) {
      syncGraphDataInPlace(value)
      return
    }

    lastEmittedGraphSignature = ''
    loadGraph(value)
  },
  { deep: true }
)

onMounted(() => {
  createLogicFlow()

  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeGraphCanvas()
    })
    resizeObserver.observe(canvasRef.value)
  }
})

onBeforeUnmount(() => {
  clearClickTimer()
  if (pendingGraphChangeFrame !== null) {
    window.cancelAnimationFrame(pendingGraphChangeFrame)
    pendingGraphChangeFrame = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
  logicFlowRef.value?.destroy()
  logicFlowRef.value = null
  selectedElement.value = null
})

defineExpose<SchemaGraphExpose>({
  saveGraph,
  loadGraph,
  syncGraphDataInPlace: syncExternalGraphDataInPlace,
  patchNode,
  patchEdge,
  getSelectedElement: () => selectedElement.value,
  exportGraphImage
})
</script>

<style scoped lang="scss">
.schema-graph {
  position: relative;
  min-height: 520px;
  border: 1px solid #d8e4f1;
  border-radius: 18px;
  background: linear-gradient(180deg, #fcfdff 0%, #f7fafd 100%);
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.06);
}

.schema-graph__toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  z-index: 8;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(191, 207, 227, 0.8);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(16px);
}

.schema-graph__toolbar-leading {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.schema-graph__toolbar-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  flex: 0 0 auto;
  margin-left: auto;
}

.schema-graph__toolbar :deep(.el-button.schema-graph__toolbar-button) {
  height: 36px;
  margin: 0;
  padding: 0 13px;
  border-color: rgba(191, 207, 227, 0.92);
  border-radius: 11px;
  background: rgba(248, 251, 255, 0.9);
  color: #23364d;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
}

.schema-graph__toolbar :deep(.el-button.schema-graph__toolbar-button:hover) {
  transform: translateY(-1px);
  border-color: rgba(96, 129, 179, 0.4);
  box-shadow: 0 12px 22px rgba(15, 23, 42, 0.08);
}

.schema-graph__toolbar :deep(.el-button.schema-graph__toolbar-button--primary) {
  border-color: rgba(37, 99, 235, 0.24);
  background: linear-gradient(180deg, #f3f8ff 0%, #e9f2ff 100%);
  color: #2457c5;
}

.schema-graph__toolbar :deep(.el-button.schema-graph__toolbar-button--addNode),
.schema-graph__toolbar :deep(.el-button.schema-graph__toolbar-button--save) {
  border-color: rgba(59, 130, 246, 0.2);
  background: linear-gradient(180deg, #f4f9ff 0%, #eaf3ff 100%);
  color: #2457c5;
}

.schema-graph__toolbar :deep(.el-button.schema-graph__toolbar-button--danger),
.schema-graph__toolbar :deep(.el-button.schema-graph__toolbar-button--delete) {
  border-color: rgba(248, 113, 113, 0.22);
  background: linear-gradient(180deg, #fff7f7 0%, #fff0f0 100%);
  color: #d14343;
}

.schema-graph__canvas {
  width: 100%;
  height: v-bind(height);
  min-height: 520px;
  background-image:
    linear-gradient(rgba(186, 200, 218, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(186, 200, 218, 0.18) 1px, transparent 1px);
  background-size: 20px 20px;
}

.schema-graph__node-badge-overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
  pointer-events: none;
}

.schema-graph__node-badge-overlay-transform {
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
}

.schema-graph__node-badge-row {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transform: translateX(-50%);
  pointer-events: none;
}

.schema-graph__node-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  background: #ffffff;
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  line-height: 1;
  font: inherit;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
  pointer-events: auto;
  cursor: pointer;
}

.schema-graph__node-badge--input-all,
.schema-graph__node-badge--input-any {
  color: #2563eb;
  border-color: rgba(59, 130, 246, 0.28);
  background: linear-gradient(180deg, #ffffff 0%, #eef5ff 100%);
}

.schema-graph__node-badge--output-condition {
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.28);
  background: linear-gradient(180deg, #ffffff 0%, #fff5e8 100%);
}

.schema-graph__node-badge--output-parallel {
  color: #059669;
  border-color: rgba(16, 185, 129, 0.28);
  background: linear-gradient(180deg, #ffffff 0%, #edfdf5 100%);
}

.schema-graph__node-badge-icon {
  display: block;
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  overflow: visible;
  color: currentColor;
  stroke-width: 1.5;
}

.schema-graph__node-badge-icon path,
.schema-graph__node-badge-icon circle,
.schema-graph__node-badge-icon ellipse,
.schema-graph__node-badge-icon line,
.schema-graph__node-badge-icon polyline,
.schema-graph__node-badge-icon polygon,
.schema-graph__node-badge-icon rect {
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: inherit;
  vector-effect: non-scaling-stroke;
}

.schema-graph__text-editor {
  position: absolute;
  z-index: 10;
  transform: translate(-50%, -50%);
}

.schema-graph__text-input {
  width: 180px;
  padding: 8px 10px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  outline: none;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.18);
}

:deep(.lf-graph) {
  border-radius: 18px;
}

:deep(.lf-node-selected) {
  filter: drop-shadow(0 14px 24px rgba(59, 130, 246, 0.2));
}

:deep(.lf-edge-text) {
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(191, 207, 227, 0.7);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 14px rgba(15, 23, 42, 0.06);
}
</style>