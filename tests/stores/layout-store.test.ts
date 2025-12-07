import { describe, it, expect, beforeEach } from 'vitest'
import { useLayoutStore } from '@/stores/layout-store'
import { LAYOUT_CONSTANTS } from '@/types/layout.types'

describe('layout-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useLayoutStore.setState({
      isSidebarCollapsed: false,
      isInspectorCollapsed: false,
      sizes: {
        sidebar: LAYOUT_CONSTANTS.DEFAULT_SIDEBAR_SIZE,
        main: LAYOUT_CONSTANTS.DEFAULT_MAIN_SIZE,
        inspector: LAYOUT_CONSTANTS.DEFAULT_INSPECTOR_SIZE,
      },
    })
    // Clear cookies
    document.cookie = 'refinery-layout=; max-age=0'
  })

  describe('sidebar collapse', () => {
    it('should start with sidebar expanded', () => {
      expect(useLayoutStore.getState().isSidebarCollapsed).toBe(false)
    })

    it('should toggle sidebar collapsed state', () => {
      const store = useLayoutStore.getState()
      
      store.toggleSidebar()
      expect(useLayoutStore.getState().isSidebarCollapsed).toBe(true)
      
      store.toggleSidebar()
      expect(useLayoutStore.getState().isSidebarCollapsed).toBe(false)
    })

    it('should set sidebar collapsed state directly', () => {
      const store = useLayoutStore.getState()
      
      store.setSidebarCollapsed(true)
      expect(useLayoutStore.getState().isSidebarCollapsed).toBe(true)
      
      store.setSidebarCollapsed(false)
      expect(useLayoutStore.getState().isSidebarCollapsed).toBe(false)
    })
  })

  describe('inspector collapse', () => {
    it('should start with inspector expanded', () => {
      expect(useLayoutStore.getState().isInspectorCollapsed).toBe(false)
    })

    it('should toggle inspector collapsed state', () => {
      const store = useLayoutStore.getState()
      
      store.toggleInspector()
      expect(useLayoutStore.getState().isInspectorCollapsed).toBe(true)
      
      store.toggleInspector()
      expect(useLayoutStore.getState().isInspectorCollapsed).toBe(false)
    })

    it('should set inspector collapsed state directly', () => {
      const store = useLayoutStore.getState()
      
      store.setInspectorCollapsed(true)
      expect(useLayoutStore.getState().isInspectorCollapsed).toBe(true)
      
      store.setInspectorCollapsed(false)
      expect(useLayoutStore.getState().isInspectorCollapsed).toBe(false)
    })
  })

  describe('sizes', () => {
    it('should have default sizes', () => {
      const sizes = useLayoutStore.getState().sizes
      expect(sizes.sidebar).toBe(LAYOUT_CONSTANTS.DEFAULT_SIDEBAR_SIZE)
      expect(sizes.main).toBe(LAYOUT_CONSTANTS.DEFAULT_MAIN_SIZE)
      expect(sizes.inspector).toBe(LAYOUT_CONSTANTS.DEFAULT_INSPECTOR_SIZE)
    })

    it('should update sizes', () => {
      const store = useLayoutStore.getState()
      const newSizes = { sidebar: 20, main: 60, inspector: 20 }

      store.setSizes(newSizes)

      expect(useLayoutStore.getState().sizes).toEqual(newSizes)
    })
  })
})
