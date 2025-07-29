import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts, type KeyboardShortcut } from '../useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  let mockAction: jest.Mock

  beforeEach(() => {
    mockAction = jest.fn()
    jest.spyOn(window, 'addEventListener')
    jest.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should register keyboard event listener on mount', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should remove keyboard event listener on unmount', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, action: mockAction }
    ]

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts))
    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('should trigger action for matching keyboard shortcut', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    })

    window.dispatchEvent(keydownEvent)
    expect(mockAction).toHaveBeenCalledTimes(1)
  })

  it('should handle meta key as ctrl equivalent', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true
    })

    window.dispatchEvent(keydownEvent)
    expect(mockAction).toHaveBeenCalledTimes(1)
  })

  it('should handle shift modifier correctly', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: '?', shift: true, action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: '?',
      shiftKey: true
    })

    window.dispatchEvent(keydownEvent)
    expect(mockAction).toHaveBeenCalledTimes(1)
  })

  it('should not trigger action when typing in input elements', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const inputElement = document.createElement('input')
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    })
    Object.defineProperty(keydownEvent, 'target', { value: inputElement })

    window.dispatchEvent(keydownEvent)
    expect(mockAction).not.toHaveBeenCalled()
  })

  it('should not trigger action when typing in textarea elements', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const textareaElement = document.createElement('textarea')
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    })
    Object.defineProperty(keydownEvent, 'target', { value: textareaElement })

    window.dispatchEvent(keydownEvent)
    expect(mockAction).not.toHaveBeenCalled()
  })

  it('should allow Escape key even when typing in input elements', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'Escape', action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const inputElement = document.createElement('input')
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'Escape'
    })
    Object.defineProperty(keydownEvent, 'target', { value: inputElement })

    window.dispatchEvent(keydownEvent)
    expect(mockAction).toHaveBeenCalledTimes(1)
  })

  it('should not trigger action when modifier keys do not match', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k'
    })

    window.dispatchEvent(keydownEvent)
    expect(mockAction).not.toHaveBeenCalled()
  })

  it('should handle case insensitive key matching', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'K', ctrl: true, action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    })

    window.dispatchEvent(keydownEvent)
    expect(mockAction).toHaveBeenCalledTimes(1)
  })

  it('should not trigger action when typing in contentEditable elements', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const editableElement = document.createElement('div')
    editableElement.contentEditable = 'true'
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    })
    Object.defineProperty(keydownEvent, 'target', { value: editableElement })

    window.dispatchEvent(keydownEvent)
    expect(mockAction).not.toHaveBeenCalled()
  })

  it('should prevent default behavior when shortcut is triggered', () => {
    const shortcuts: KeyboardShortcut[] = [
      { key: 'k', ctrl: true, action: mockAction }
    ]

    renderHook(() => useKeyboardShortcuts(shortcuts))

    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true
    })
    const preventDefaultSpy = jest.spyOn(keydownEvent, 'preventDefault')

    window.dispatchEvent(keydownEvent)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })
})
