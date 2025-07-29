import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '../../../../lib/hooks/useKeyboardShortcuts'

describe('BoardPage Keyboard Shortcuts Integration', () => {
  let mockCreateNote: jest.Mock
  let mockFocusSearch: jest.Mock
  let mockToggleHelp: jest.Mock
  let mockCloseModal: jest.Mock

  beforeEach(() => {
    mockCreateNote = jest.fn()
    mockFocusSearch = jest.fn()
    mockToggleHelp = jest.fn()
    mockCloseModal = jest.fn()
    jest.spyOn(window, 'addEventListener')
    jest.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should register board page keyboard shortcuts correctly', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockCreateNote },
      { key: '/', action: mockFocusSearch },
      { key: '?', shift: true, action: mockToggleHelp },
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should trigger create note action when Ctrl+K is pressed', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockCreateNote },
      { key: '/', action: mockFocusSearch },
      { key: '?', shift: true, action: mockToggleHelp },
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    })

    window.dispatchEvent(keydownEvent)
    expect(mockCreateNote).toHaveBeenCalledTimes(1)
  })

  it('should trigger create note action when Meta+K is pressed (Mac)', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockCreateNote },
      { key: '/', action: mockFocusSearch },
      { key: '?', shift: true, action: mockToggleHelp },
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true
    })

    window.dispatchEvent(keydownEvent)
    expect(mockCreateNote).toHaveBeenCalledTimes(1)
  })

  it('should trigger focus search when / is pressed', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockCreateNote },
      { key: '/', action: mockFocusSearch },
      { key: '?', shift: true, action: mockToggleHelp },
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: '/'
    })

    window.dispatchEvent(keydownEvent)
    expect(mockFocusSearch).toHaveBeenCalledTimes(1)
  })

  it('should trigger help toggle when Shift+? is pressed', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockCreateNote },
      { key: '/', action: mockFocusSearch },
      { key: '?', shift: true, action: mockToggleHelp },
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: '?',
      shiftKey: true
    })

    window.dispatchEvent(keydownEvent)
    expect(mockToggleHelp).toHaveBeenCalledTimes(1)
  })

  it('should trigger close modal when Escape is pressed', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockCreateNote },
      { key: '/', action: mockFocusSearch },
      { key: '?', shift: true, action: mockToggleHelp },
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'Escape'
    })

    window.dispatchEvent(keydownEvent)
    expect(mockCloseModal).toHaveBeenCalledTimes(1)
  })

  it('should not trigger shortcuts when typing in search input', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockCreateNote },
      { key: '/', action: mockFocusSearch }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const inputElement = document.createElement('input')
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    })
    Object.defineProperty(keydownEvent, 'target', { value: inputElement })

    window.dispatchEvent(keydownEvent)
    expect(mockCreateNote).not.toHaveBeenCalled()
  })

  it('should allow Escape even when typing in input elements', () => {
    const shortcuts = [
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const inputElement = document.createElement('input')
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'Escape'
    })
    Object.defineProperty(keydownEvent, 'target', { value: inputElement })

    window.dispatchEvent(keydownEvent)
    expect(mockCloseModal).toHaveBeenCalledTimes(1)
  })

  it('should handle special case for slash key in search', () => {
    const shortcuts = [
      { key: '/', action: mockFocusSearch }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: '/'
    })

    window.dispatchEvent(keydownEvent)
    expect(mockFocusSearch).toHaveBeenCalledTimes(1)
  })
})
