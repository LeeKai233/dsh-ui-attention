/** T12: the General-settings row UI — switches, verbs, permission hints. */
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
    test: vi.fn(async () => {}),
  }
}

describe('AttentionRow', () => {
  afterEach(cleanup)

  it('renders the title, four switches, and the test button', () => {
    const instance = createAttentionRowStore().create()
    render(<Harness instance={instance} injected={verbs()} />)
    expect(screen.getByText('row.title')).toBeTruthy()
    expect(screen.getByLabelText('row.enabled')).toBeTruthy()
    expect(screen.getByLabelText('row.sound')).toBeTruthy()
    expect(screen.getByLabelText('row.titleFlash')).toBeTruthy()
    expect(screen.getByLabelText('row.onlyWhenHidden')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'row.test' })).toBeTruthy()
  })

  it('reflects the store state in every switch', () => {
    const instance = createAttentionRowStore().create()
    instance.actions.sync({ enabled: false, sound: true, titleFlash: false, onlyWhenHidden: true })
    instance.actions.syncPermission('granted')
    render(<Harness instance={instance} injected={verbs()} />)
    expect((screen.getByLabelText('row.enabled') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByLabelText('row.titleFlash') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByLabelText('row.sound') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('row.onlyWhenHidden') as HTMLInputElement).checked).toBe(true)
  })

  it('forwards each switch flip to its injected verb', () => {
    const injected = verbs()
    const instance = createAttentionRowStore().create()
    render(<Harness instance={instance} injected={injected} />)
    fireEvent.click(screen.getByLabelText('row.enabled'))
    fireEvent.click(screen.getByLabelText('row.sound'))
    fireEvent.click(screen.getByLabelText('row.titleFlash'))
    fireEvent.click(screen.getByLabelText('row.onlyWhenHidden'))
    expect(injected.setEnabled).toHaveBeenCalledWith(false)
    expect(injected.setSound).toHaveBeenCalledWith(false)
    expect(injected.setTitleFlash).toHaveBeenCalledWith(false)
    expect(injected.setOnlyWhenHidden).toHaveBeenCalledWith(false)
  })

  it('runs the test flow from the button', () => {
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

  it('shows no hint once permission is granted', () => {
    const instance = createAttentionRowStore().create()
    instance.actions.sync({ ...DEFAULT_ATTENTION_SETTINGS })
    instance.actions.syncPermission('granted')
    render(<Harness instance={instance} injected={verbs()} />)
    expect(screen.queryByText('row.permissionHint')).toBeNull()
    expect(screen.queryByText('row.permissionDenied')).toBeNull()
  })
})
