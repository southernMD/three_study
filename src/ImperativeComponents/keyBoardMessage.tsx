import { defineComponent, ref, onMounted, onUnmounted, computed, PropType, CSSProperties, createApp, toRef } from 'vue'

// 组件接口定义
interface KeyBoardMessageProps {
  targetKey: string // 目标按键
  message: string // 显示消息
  visible?: boolean // 是否显示
  onKeyPress?: () => void // 按键触发事件
  hideDelay?: number // 自动隐藏延迟(ms)
  activeMeshName: string
}

// 样式定义
const getContainerStyle = (): CSSProperties => ({
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: `translate(-50%, -50%)`,
  zIndex: 9999,
  pointerEvents: 'none',
  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
})

const getMessageBoxStyle = (): CSSProperties => ({
  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.85) 0%, rgba(20, 20, 30, 0.9) 100%)',
  border: '2px solid rgba(255, 215, 0, 0.8)',
  borderRadius: '12px',
  padding: '16px 24px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  minWidth: '200px',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden',
})

const getKeyIconStyle = (pressed: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  background: 'linear-gradient(145deg, #4a4a4a, #2a2a2a)',
  border: '2px solid #666',
  borderRadius: '6px',
  color: '#fff',
  fontWeight: 'bold',
  fontSize: '16px',
  marginRight: '12px',
  boxShadow: pressed
    ? '0 1px 2px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
    : '0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  transition: 'all 0.2s ease',
  transform: pressed ? 'translateY(1px)' : 'translateY(0)',
})

const getMessageTextStyle = (): CSSProperties => ({
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '500',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
  letterSpacing: '0.5px',
})

const getGlowEffectStyle = (): CSSProperties => ({
  position: 'absolute',
  top: '-2px',
  left: '-2px',
  right: '-2px',
  bottom: '-2px',
  background: 'linear-gradient(45deg, #ffd700, #ffed4e, #ffd700)',
  borderRadius: '14px',
  zIndex: -1,
  opacity: 0.6,
  filter: 'blur(4px)',
})

const KeyBoardMessageBox = defineComponent({
  name: 'KeyBoardMessageBox',
  props: {
    onClose:{
      type: Function as PropType<() => void>,
      default: () => {}
    },
    targetKey: {
      type: String as PropType<string>,
      required: true
    },
    message: {
      type: String as PropType<string>,
      required: true
    },
    visible: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    onKeyPress: {
      type: Function as PropType<() => void>,
      default: () => {}
    },
    hideDelay: {
      type: Number as PropType<number>,
      default: 3000
    }
  },
  setup(props) {
    const isKeyPressed = ref(false)
    const hideTimer = ref<number | null>(props.hideDelay)

    // 按键事件处理
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === props.targetKey.toLowerCase()) {
        isKeyPressed.value = true

        if (props.onKeyPress) {
          props.onKeyPress()
        }
        props.onClose()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === props.targetKey.toLowerCase()) {
        isKeyPressed.value = false
      }
    }

    // 生命周期
    onMounted(() => {
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)
    })

    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (hideTimer.value) {
        clearTimeout(hideTimer.value)
      }
    })

    return () => (
      <div style={getContainerStyle()}>
        <div style={getMessageBoxStyle()} class="genshin-message-box">
          <div style={getGlowEffectStyle()} class="genshin-glow-effect"></div>
          <div style={getKeyIconStyle(isKeyPressed.value)}>
            {props.targetKey.toUpperCase()}
          </div>
          <span style={getMessageTextStyle()}>{props.message}</span>
        </div>
      </div>
    )
  }
})

// CSS样式注入
const injectStyles = () => {
  const styleId = 'keyboard-message-styles'
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    @keyframes genshin-glow {
      0% { opacity: 0.4; filter: blur(4px); }
      50% { opacity: 0.8; filter: blur(6px); }
      100% { opacity: 0.4; filter: blur(4px); }
    }

    @keyframes genshin-shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }

    .genshin-message-box::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.2), transparent);
      animation: genshin-shimmer 2s infinite;
    }

    .genshin-glow-effect {
      animation: genshin-glow 2s ease-in-out infinite alternate;
    }
  `
  document.head.appendChild(style)
}

// 自动注入样式
if (typeof window !== 'undefined') {
  injectStyles()
}

// 单例管理
let currentInstance: {
  app: any;
  div: HTMLElement;
  destroy: () => void;
  update: (newProps: Partial<KeyBoardMessageProps>) => void;
  activeMeshName: string;
} | null = null;

export default function mountKeyBoardMessageBox(props: KeyBoardMessageProps = {
    targetKey: '', // 提供默认值
    message: '',   // 提供默认值
    hideDelay: 3000,
    activeMeshName:''
}) {
    // 如果已经存在实例，跳过创建
    if (currentInstance) {
        console.log('⚠️ KeyBoardMessageBox实例已存在，跳过创建，只更新属性');
        return ;
    }

    console.log('🆕 创建新的KeyBoardMessageBox实例');

    const div = document.createElement('div');
    document.body.appendChild(div);

    // 创建响应式的props
    const reactiveProps = ref(props);

    const app = createApp({
        setup() {
            const handleClose = () => {
                if (currentInstance) {
                    currentInstance.destroy();
                    currentInstance = null;
                }
            };

            // 确保传递所有必需的属性
            return () => (
                <KeyBoardMessageBox
                    targetKey={reactiveProps.value.targetKey}
                    message={reactiveProps.value.message}
                    visible={reactiveProps.value.visible}
                    onKeyPress={reactiveProps.value.onKeyPress}
                    hideDelay={reactiveProps.value.hideDelay}
                    onClose={handleClose}
                />
            )
        }
    });

    app.mount(div);

    // 创建实例对象
    const instance = {
        app,
        div,
        destroy: () => {
            console.log('🗑️ 销毁KeyBoardMessageBox实例');
            app.unmount();
            if (div.parentNode) {
                document.body.removeChild(div);
            }
        },
        update: (newProps: Partial<KeyBoardMessageProps>) => {
            console.log('🔄 更新KeyBoardMessageBox属性', newProps);
            reactiveProps.value = { ...reactiveProps.value, ...newProps };
        },
        activeMeshName:reactiveProps.value.activeMeshName
    };

    // 保存当前实例
    currentInstance = instance;
    console.log('✅ 创建新的KeyBoardMessageBox实例');

    return instance;
}

// 强制创建新实例（销毁现有实例）
export function forceCreateKeyBoardMessageBox(props: KeyBoardMessageProps = {
    targetKey: '',
    message: '',
    hideDelay: 3000,
    activeMeshName: ''
}) {
    // 强制销毁现有实例
    if (currentInstance) {
        console.log('🔄 强制销毁现有的KeyBoardMessageBox实例');
        currentInstance.destroy();
        currentInstance = null;
    }

    // 创建新实例
    console.log('✅ 强制创建新的KeyBoardMessageBox实例');
    return mountKeyBoardMessageBox(props);
}

// 便捷的全局管理函数
export const KeyBoardMessageManager = {
  // 显示消息框（如果已存在则跳过创建，只更新属性）
  show: (props: KeyBoardMessageProps) => {
    return mountKeyBoardMessageBox(props);
  },

  // 强制创建新消息框（销毁现有实例）
  forceCreate: (props: KeyBoardMessageProps) => {
    return forceCreateKeyBoardMessageBox(props);
  },

  // 更新当前消息框
  update: (props: Partial<KeyBoardMessageProps>) => {
    if (currentInstance) {
      currentInstance.update(props);
    } else {
      console.warn('⚠️ 没有活跃的KeyBoardMessageBox实例可以更新');
    }
  },

  // 隐藏/销毁当前消息框
  hide: () => {
    if (currentInstance) {
      currentInstance.destroy();
      currentInstance = null;
    }
  },

  // 检查是否有活跃实例
  isActive: () => {
    return currentInstance !== null;
  },

  // 获取当前实例
  getInstance: () => {
    return currentInstance;
  },

  // 安全显示（如果没有实例则创建，如果有实例则更新）
  safeShow: (props: KeyBoardMessageProps) => {
    if (currentInstance) {
      console.log('📝 更新现有KeyBoardMessageBox实例');
      currentInstance.update(props);
      return currentInstance;
    } else {
      console.log('🆕 创建新的KeyBoardMessageBox实例');
      return mountKeyBoardMessageBox(props);
    }
  },

  getActiveMeshName: () => {
    return currentInstance?.activeMeshName;
  },
  setActiveMeshName: (name:string) => {
    if (currentInstance) {
      currentInstance.activeMeshName = name;
    }
  },
};
