/** T12+T17: the General-settings row — official chrome, iOS-style switches, verbs, hints. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AttentionRow, createAttentionRowStore } from '../src/client/AttentionRow.tsx'
import type { AttentionRowInjected, AttentionRowState } from '../src/client/AttentionRow.tsx'
import { DEFAULT_ATTENTION_SETTINGS } from '../src/attention-settings.ts'

type RowInstance = ReturnType<ReturnType<typeof createAttentionRowStore>['create']>

function Harness({ instance, injected }: { instance: RowInstance; injected: AttentionRowInjected }) {
  const [, setTick] = useState(0)
  useEffect(() => instance.subscribe(() => { setTick(t => t + 1) }), [instance])
  const useStore = <S,>(sel: (s: AttentionRowState) => S): S => sel(instance.getSnapshot())
  return (
    <AttentionRow
      {...({
        runtime: {},
        useStore,
        actions: instance.actions,
        t: (key: string) => key,
        ...injected,
      } as never)}
    />
  )
}

function verbs(): AttentionRowInjected {
  return {
    setEnabled: vi.fn(),
    setSound: vi.fn(),
    setTitleFlash: vi.fn(),
    setOnlyWhenHidden: vi.fn(),
    setNotifyOnDone: vi.fn(),
    test: vi.fn(async () => {}),
  }
}

const SWITCH_NAMES = ['row.enabled', 'row.sound', 'row.titleFlash', 'row.onlyWhenHidden', 'row.notifyOnDone']

describe('AttentionRow', () => {
  afterEach(cleanup)

  it('renders the title, five switch controls, and the test pill', () => {
    const instance = createAttentionRowStore().create()
    render(<Harness instance={instance} injected={verbs()} />)
    expect(screen.getByText('row.title')).toBeTruthy()
    for (const name of SWITCH_NAMES) {
      const control = screen.getByRole('switch', { name })
      expect(control).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: 'row.test' })).toBeTruthy()
  })

  it('reflects the store state in every switch (aria-checked)', () => {
    const instance = createAttentionRowStore().create()
    instance.actions.sync({ enabled: false, sound: true, titleFlash: false, onlyWhenHidden: true, notifyOnDone: false })
    instance.actions.syncPermission('granted')
    render(<Harness instance={instance} injected={verbs()} />)
    expect(screen.getByRole('switch', { name: 'row.enabled' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('switch', { name: 'row.sound' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('switch', { name: 'row.titleFlash' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('switch', { name: 'row.onlyWhenHidden' }).getAttribute('aria-checked')).toBe('true')
    expect(screen.getByRole('switch', { name: 'row.notifyOnDone' }).getAttribute('aria-checked')).toBe('false')
  })

  it('forwards each switch click to its injected verb with the opposite value', () => {
    const injected = verbs()
    const instance = createAttentionRowStore().create()
    render(<Harness instance={instance} injected={injected} />)
    fireEvent.click(screen.getByRole('switch', { name: 'row.enabled' }))
    fireEvent.click(screen.getByRole('switch', { name: 'row.sound' }))
    fireEvent.click(screen.getByRole('switch', { name: 'row.titleFlash' }))
    fireEvent.click(screen.getByRole('switch', { name: 'row.onlyWhenHidden' }))
    fireEvent.click(screen.getByRole('switch', { name: 'row.notifyOnDone' }))
    expect(injected.setEnabled).toHaveBeenCalledWith(false)
    expect(injected.setSound).toHaveBeenCalledWith(false)
    expect(injected.setTitleFlash).toHaveBeenCalledWith(false)
    expect(injected.setOnlyWhenHidden).toHaveBeenCalledWith(false)
    expect(injected.setNotifyOnDone).toHaveBeenCalledWith(false)
  })

  it('shows no on/off text labels (switches carry the state visually)', () => {
    const instance = createAttentionRowStore().create()
    render(<Harness instance={instance} injected={verbs()} />)
    expect(screen.queryByText('row.on')).toBeNull()
    expect(screen.queryByText('row.off')).toBeNull()
  })

  it('runs the test flow from the test pill', () => {
    const injected = verbs()
    const instance = createAttentionRowStore().create()
    render(<Harness instance={instance} injected={injected} />)
    fireEvent.click(screen.getByRole('button', { name: 'row.test' }))
    expect(injected.test).toHaveBeenCalledTimes(1)
  })

  it('shows the enable hint while permission is default', () => {
    const instance = createAttentionRowStore().create()
    instance.actions.sync({ ...DEFAULT_ATTENTION_SETTINGS })
    instance.actions.syncPermission('default')
    render(<Harness instance={instance} injected={verbs()} />)
    expect(screen.getByText('row.permissionHint')).toBeTruthy()
    expect(screen.queryByText('row.permissionDenied')).toBeNull()
  })

  it('shows the denied hint when permission is denied or unavailable', () => {
    for (const permission of ['denied', 'unavailable'] as const) {
      const instance = createAttentionRowStore().create()
      instance.actions.sync({ ...DEFAULT_ATTENTION_SETTINGS })
      instance.actions.syncPermission(permission)
      const { unmount } = render(<Harness instance={instance} injected={verbs()} />)
      expect(screen.getByText('row.permissionDenied')).toBeTruthy()
      expect(screen.queryByText('row.permissionHint')).toBeNull()
      unmount()
    }
  })

  it('shows the plain summary once permission is granted', () => {
    const instance = createAttentionRowStore().create()
    instance.actions.sync({ ...DEFAULT_ATTENTION_SETTINGS })
    instance.actions.syncPermission('granted')
    render(<Harness instance={instance} injected={verbs()} />)
    expect(screen.getByText('row.summary')).toBeTruthy()
    expect(screen.queryByText('row.permissionHint')).toBeNull()
    expect(screen.queryByText('row.permissionDenied')).toBeNull()
  })
})
