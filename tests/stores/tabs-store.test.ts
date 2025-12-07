import { describe, it, expect, beforeEach } from 'vitest'
import { useTabsStore } from '@/stores/tabs-store'

describe('tabs-store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useTabsStore.getState().reset()
  })

  describe('openTab', () => {
    it('should create a new tab when noteId does not exist', () => {
      const tabId = useTabsStore.getState().openTab('note-1', 'Test Note')

      expect(tabId).toBeDefined()
      const state = useTabsStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.tabs[0]).toMatchObject({
        noteId: 'note-1',
        title: 'Test Note',
      })
    })

    it('should return existing tab if noteId already open', () => {
      const store = useTabsStore.getState()
      const tabId1 = store.openTab('note-1', 'Test Note')
      const tabId2 = store.openTab('note-1', 'Test Note Updated')

      expect(tabId1).toBe(tabId2)
      expect(useTabsStore.getState().tabs).toHaveLength(1)
    })

    it('should activate tab by default', () => {
      const store = useTabsStore.getState()
      const tabId = store.openTab('note-1', 'Test Note')

      expect(useTabsStore.getState().activeTabId).toBe(tabId)
    })

    it('should not activate tab when activate=false', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'First Note')
      const firstTabId = useTabsStore.getState().activeTabId

      store.openTab('note-2', 'Second Note', false)

      expect(useTabsStore.getState().activeTabId).toBe(firstTabId)
    })

    it('should set default title "New Note" for new notes', () => {
      const store = useTabsStore.getState()
      store.openTab('new')

      expect(useTabsStore.getState().tabs[0].title).toBe('New Note')
    })

    it('should set default title "Untitled" for existing notes without title', () => {
      const store = useTabsStore.getState()
      store.openTab('existing-note-id')

      expect(useTabsStore.getState().tabs[0].title).toBe('Untitled')
    })

    it('should respect MAX_TABS limit (15)', () => {
      const store = useTabsStore.getState()
      
      // Open 16 tabs
      for (let i = 0; i < 16; i++) {
        store.openTab(`note-${i}`, `Note ${i}`)
      }

      expect(useTabsStore.getState().tabs).toHaveLength(15)
    })

    it('should remove oldest non-active tab when exceeding MAX_TABS', () => {
      const store = useTabsStore.getState()
      
      // Open 15 tabs
      for (let i = 0; i < 15; i++) {
        store.openTab(`note-${i}`, `Note ${i}`)
      }

      // Activate first tab
      const firstTabId = useTabsStore.getState().tabs[0].id
      store.activateTab(firstTabId)

      // Open 16th tab - should remove a non-active tab
      store.openTab('note-15', 'Note 15')

      const tabs = useTabsStore.getState().tabs
      expect(tabs).toHaveLength(15)
      // First tab should still exist (it's active)
      expect(tabs.find(t => t.id === firstTabId)).toBeDefined()
    })

    it('should hide list view when opening tab', () => {
      const store = useTabsStore.getState()
      store.setShowListView(true)
      
      store.openTab('note-1', 'Test Note')

      expect(useTabsStore.getState().showListView).toBe(false)
    })
  })

  describe('closeTab', () => {
    it('should remove the tab', () => {
      const store = useTabsStore.getState()
      const tabId = store.openTab('note-1', 'Test Note')
      
      store.closeTab(tabId)

      expect(useTabsStore.getState().tabs).toHaveLength(0)
    })

    it('should activate adjacent tab when closing active tab', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'Note 1')
      const tabId2 = store.openTab('note-2', 'Note 2')
      store.openTab('note-3', 'Note 3')

      // Activate middle tab
      store.activateTab(tabId2)
      
      // Close middle tab
      store.closeTab(tabId2)

      // Should activate the tab at the same index (note-3)
      const activeTab = useTabsStore.getState().tabs.find(
        t => t.id === useTabsStore.getState().activeTabId
      )
      expect(activeTab?.noteId).toBe('note-3')
    })

    it('should activate previous tab when closing last tab', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'Note 1')
      const tabId2 = store.openTab('note-2', 'Note 2')

      // Close last tab
      store.closeTab(tabId2)

      const activeTab = useTabsStore.getState().tabs.find(
        t => t.id === useTabsStore.getState().activeTabId
      )
      expect(activeTab?.noteId).toBe('note-1')
    })

    it('should set activeTabId to null when closing only tab', () => {
      const store = useTabsStore.getState()
      const tabId = store.openTab('note-1', 'Test Note')
      
      store.closeTab(tabId)

      expect(useTabsStore.getState().activeTabId).toBeNull()
    })

    it('should do nothing when tab does not exist', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'Test Note')
      
      store.closeTab('non-existent-id')

      expect(useTabsStore.getState().tabs).toHaveLength(1)
    })
  })

  describe('activateTab', () => {
    it('should set activeTabId', () => {
      const store = useTabsStore.getState()
      const tabId1 = store.openTab('note-1', 'Note 1')
      store.openTab('note-2', 'Note 2')

      store.activateTab(tabId1)

      expect(useTabsStore.getState().activeTabId).toBe(tabId1)
    })

    it('should hide list view when activating tab', () => {
      const store = useTabsStore.getState()
      const tabId = store.openTab('note-1', 'Note 1')
      store.setShowListView(true)

      store.activateTab(tabId)

      expect(useTabsStore.getState().showListView).toBe(false)
    })

    it('should do nothing if tab does not exist', () => {
      const store = useTabsStore.getState()
      const tabId = store.openTab('note-1', 'Note 1')
      
      store.activateTab('non-existent')

      expect(useTabsStore.getState().activeTabId).toBe(tabId)
    })
  })

  describe('updateTabTitle', () => {
    it('should update the tab title', () => {
      const store = useTabsStore.getState()
      const tabId = store.openTab('note-1', 'Original Title')

      store.updateTabTitle(tabId, 'New Title')

      expect(useTabsStore.getState().tabs[0].title).toBe('New Title')
    })

    it('should set "Untitled" when title is empty', () => {
      const store = useTabsStore.getState()
      const tabId = store.openTab('note-1', 'Original Title')

      store.updateTabTitle(tabId, '')

      expect(useTabsStore.getState().tabs[0].title).toBe('Untitled')
    })
  })

  describe('updateTabNoteId', () => {
    it('should update the noteId', () => {
      const store = useTabsStore.getState()
      const tabId = store.openTab('temp_123', 'New Note')

      store.updateTabNoteId(tabId, 'server-uuid-123')

      expect(useTabsStore.getState().tabs[0].noteId).toBe('server-uuid-123')
    })
  })

  describe('reorderTabs', () => {
    it('should move tab from one position to another', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'Note 1')
      store.openTab('note-2', 'Note 2')
      store.openTab('note-3', 'Note 3')

      store.reorderTabs(0, 2)

      const tabs = useTabsStore.getState().tabs
      expect(tabs[0].noteId).toBe('note-2')
      expect(tabs[1].noteId).toBe('note-3')
      expect(tabs[2].noteId).toBe('note-1')
    })

    it('should not modify tabs when fromIndex is invalid', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'Note 1')
      store.openTab('note-2', 'Note 2')

      store.reorderTabs(-1, 1)

      const tabs = useTabsStore.getState().tabs
      expect(tabs[0].noteId).toBe('note-1')
      expect(tabs[1].noteId).toBe('note-2')
    })

    it('should not modify tabs when toIndex is invalid', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'Note 1')
      store.openTab('note-2', 'Note 2')

      store.reorderTabs(0, 10)

      const tabs = useTabsStore.getState().tabs
      expect(tabs[0].noteId).toBe('note-1')
      expect(tabs[1].noteId).toBe('note-2')
    })
  })

  describe('getTabByNoteId', () => {
    it('should return tab when found', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'Test Note')

      const tab = store.getTabByNoteId('note-1')

      expect(tab).toBeDefined()
      expect(tab?.noteId).toBe('note-1')
    })

    it('should return undefined when not found', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'Test Note')

      const tab = store.getTabByNoteId('note-999')

      expect(tab).toBeUndefined()
    })
  })

  describe('setShowListView', () => {
    it('should toggle showListView', () => {
      const store = useTabsStore.getState()
      
      store.setShowListView(true)
      expect(useTabsStore.getState().showListView).toBe(true)
      
      store.setShowListView(false)
      expect(useTabsStore.getState().showListView).toBe(false)
    })
  })

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'Note 1')
      store.openTab('note-2', 'Note 2')
      store.setShowListView(true)

      store.reset()

      const state = useTabsStore.getState()
      expect(state.tabs).toHaveLength(0)
      expect(state.activeTabId).toBeNull()
      expect(state.showListView).toBe(false)
    })
  })

  describe('persistence', () => {
    it('should persist tabs to localStorage', () => {
      const store = useTabsStore.getState()
      store.openTab('note-1', 'Test Note')

      // Trigger persist
      const stored = localStorage.getItem('refinery-tabs')
      expect(stored).toBeTruthy()
      
      const parsed = JSON.parse(stored!)
      expect(parsed.state.tabs).toHaveLength(1)
    })
  })
})
