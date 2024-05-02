import { expect, describe, it } from 'vitest'
import { getPageContextRequestUrl } from './getPageContextRequestUrl'

describe('getPageContextRequestUrl()', () => {
  it('return page context request url', () => {
    expect(
      getPageContextRequestUrl('/test')
    ).toMatchInlineSnapshot('"/test/index.pageContext.json"')
  })
  it('return page context request url with trailing slash', () => {
    expect(
      getPageContextRequestUrl('/test/')
    ).toMatchInlineSnapshot('"/test/index.pageContext.json/"')
  })
})