import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '../../../lib/hooks/useKeyboardShortcuts'

describe('Dashboard Keyboard Shortcuts Integration', () => {
  let mockCreateBoard: jest.Mock
  let mockToggleHelp: jest.Mock
  let mockCloseModal: jest.Mock

  beforeEach(() => {
    mockCreateBoard = jest.fn()
    mockToggleHelp = jest.fn()
    mockCloseModal = jest.fn()
    jest.spyOn(window, 'addEventListener')
    jest.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should register dashboard keyboard shortcuts correctly', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockCreateBoard },
      { key: '?', shift: true, action: mockToggleHelp },
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should trigger focus search action when Ctrl+K is pressed', () => {
    const mockFocusSearch = jest.fn()
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockFocusSearch },
      { key: 'n', action: mockCreateBoard },
      { key: '?', shift: true, action: mockToggleHelp },
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    })

    window.dispatchEvent(keydownEvent)
    expect(mockFocusSearch).toHaveBeenCalledTimes(1)
  })

  it('should trigger focus search action when Meta+K is pressed (Mac)', () => {
    const mockFocusSearch = jest.fn()
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockFocusSearch },
      { key: 'n', action: mockCreateBoard },
      { key: '?', shift: true, action: mockToggleHelp },
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true
    })

    window.dispatchEvent(keydownEvent)
    expect(mockFocusSearch).toHaveBeenCalledTimes(1)
  })

  it('should trigger create board action when n is pressed', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: jest.fn() },
      { key: 'n', action: mockCreateBoard },
      { key: '?', shift: true, action: mockToggleHelp },
      { key: 'Escape', action: mockCloseModal }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'n'
    })

    window.dispatchEvent(keydownEvent)
    expect(mockCreateBoard).toHaveBeenCalledTimes(1)
  })

  it('should trigger help toggle when Shift+? is pressed', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockCreateBoard },
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
      { key: 'k', ctrl: true, action: mockCreateBoard },
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

  it('should not trigger shortcuts when typing in input elements', () => {
    const shortcuts = [
      { key: 'k', ctrl: true, action: mockCreateBoard }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const inputElement = document.createElement('input')
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    })
    Object.defineProperty(keydownEvent, 'target', { value: inputElement })

    window.dispatchEvent(keydownEvent)
    expect(mockCreateBoard).not.toHaveBeenCalled()
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
})
