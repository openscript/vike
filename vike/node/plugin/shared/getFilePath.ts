export { getFilePathResolved }
export { getFilePathUnresolved }
export { getModuleFilePath }
export { getFilePathToShowToUserFromUnkown }
export { cleanFilePathUnkown }
export { getFilePathAbsoluteUserRootDir }

import path from 'path'
import {
  assert,
  assertIsNpmPackageImport,
  assertPathFilesystemAbsolute,
  assertPosixPath,
  toPosixPath
} from '../utils.js'
import type { FilePathResolved, FilePathUnresolved } from '../../../shared/page-configs/FilePath.js'
import type { ResolvedConfig } from 'vite'

function getFilePathResolved(
  args: {
    userRootDir: string
  } & (
    | { filePathAbsoluteFilesystem: string; importPathAbsolute: string }
    | { filePathAbsoluteUserRootDir: string; importPathAbsolute?: string }
  )
): FilePathResolved {
  const { userRootDir } = args

  let filePathAbsoluteFilesystem: string
  let filePathAbsoluteUserRootDir: string | null
  if ('filePathAbsoluteFilesystem' in args) {
    filePathAbsoluteFilesystem = args.filePathAbsoluteFilesystem
    filePathAbsoluteUserRootDir = getFilePathAbsoluteUserRootDir({ filePathAbsoluteFilesystem, userRootDir })
  } else {
    filePathAbsoluteUserRootDir = args.filePathAbsoluteUserRootDir
    filePathAbsoluteFilesystem = getFilePathAbsoluteUserFilesystem({ filePathAbsoluteUserRootDir, userRootDir })
  }

  assert(filePathAbsoluteFilesystem)
  assertPathFilesystemAbsolute(filePathAbsoluteFilesystem)
  const filePathToShowToUserResolved = filePathAbsoluteUserRootDir || filePathAbsoluteFilesystem
  assert(filePathToShowToUserResolved)

  assertPosixPath(filePathAbsoluteFilesystem)
  const fileName = path.posix.basename(filePathAbsoluteFilesystem)

  const filePathResolved: FilePathResolved = {
    ...getComputedProps(args),
    filePathAbsoluteFilesystem,
    filePathToShowToUserResolved,
    fileName
  }
  return filePathResolved
}

function getComputedProps(
  args: { importPathAbsolute: string } | { filePathAbsoluteUserRootDir: string; importPathAbsolute?: string }
) {
  if ('filePathAbsoluteUserRootDir' in args) {
    const importPathAbsolute = args.importPathAbsolute ?? null
    const { filePathAbsoluteUserRootDir } = args
    if (importPathAbsolute) assertIsNpmPackageImport(importPathAbsolute)
    return {
      importPathAbsolute,
      filePathAbsoluteUserRootDir,
      filePathAbsoluteVite: filePathAbsoluteUserRootDir,
      filePathToShowToUser: filePathAbsoluteUserRootDir
    }
  } else {
    return getComputedPropsImportPathAbsolute(args)
  }
}
function getComputedPropsImportPathAbsolute(args: { importPathAbsolute: string }) {
  const { importPathAbsolute } = args
  assertIsNpmPackageImport(importPathAbsolute)
  return {
    filePathAbsoluteUserRootDir: null,
    importPathAbsolute,
    filePathAbsoluteVite: importPathAbsolute,
    filePathToShowToUser: importPathAbsolute
  }
}

function getFilePathUnresolved(args: { importPathAbsolute: string }): FilePathUnresolved {
  return {
    ...getComputedPropsImportPathAbsolute(args),
    filePathAbsoluteFilesystem: null
  }
}

function getFilePathAbsoluteUserFilesystem({
  filePathAbsoluteUserRootDir,
  userRootDir
}: {
  filePathAbsoluteUserRootDir: string
  userRootDir: string
}): string {
  assertPosixPath(filePathAbsoluteUserRootDir)
  assertPosixPath(userRootDir)
  assertPathFilesystemAbsolute(userRootDir)

  const filePathAbsoluteFilesystem = path.posix.join(userRootDir, filePathAbsoluteUserRootDir)
  assertPathFilesystemAbsolute(userRootDir)
  return filePathAbsoluteFilesystem
}
function getFilePathAbsoluteUserRootDir({
  filePathAbsoluteFilesystem,
  userRootDir
}: {
  filePathAbsoluteFilesystem: string
  userRootDir: string
}): string | null {
  assertPosixPath(filePathAbsoluteFilesystem)
  assertPosixPath(userRootDir)
  assertPathFilesystemAbsolute(filePathAbsoluteFilesystem)
  assertPathFilesystemAbsolute(userRootDir)

  const filePathRelative = path.posix.relative(userRootDir, filePathAbsoluteFilesystem)

  if (!filePathAbsoluteFilesystem.startsWith(userRootDir)) {
    assert(filePathRelative.startsWith('../'))
    return null
  }

  assert(
    !filePathRelative.startsWith('/') &&
      /* Not true if filePathRelative starts with a hidden directory  (i.e. a directory with a name that starts with `.`)
      !filePathRelative.startsWith('.') &&
      */
      !filePathRelative.startsWith('./') &&
      !filePathRelative.startsWith('../')
  )
  const filePathAbsoluteUserRootDir = `/${filePathRelative}`
  assert(filePathAbsoluteUserRootDir === getFilePathAbsoluteUserRootDir2(filePathAbsoluteFilesystem, userRootDir))
  return filePathAbsoluteUserRootDir
}

function getModuleFilePath(moduleId: string, config: ResolvedConfig): string {
  const userRootDir = config.root
  assertPosixPath(moduleId)
  assertPosixPath(userRootDir)

  const filePathAbsoluteFilesystem = cleanModuleId(moduleId)
  assertPathFilesystemAbsolute(filePathAbsoluteFilesystem)

  const filePathAbsoluteUserRootDir = getFilePathAbsoluteUserRootDir({ filePathAbsoluteFilesystem, userRootDir })

  return filePathAbsoluteUserRootDir || filePathAbsoluteFilesystem
}

function getFilePathToShowToUserFromUnkown(
  // We don't have any guarentee about filePath, e.g. about whether is filePathAbsoluteFilesystem or filePathAbsoluteUserRootDir
  filePathUnkown: string,
  userRootDir: string
): string {
  assertPosixPath(userRootDir)
  assertPathFilesystemAbsolute(userRootDir)

  filePathUnkown = cleanFilePathUnkown(filePathUnkown)

  if (!filePathUnkown.startsWith(userRootDir)) {
    return filePathUnkown
  } else {
    return getFilePathAbsoluteUserRootDir2(filePathUnkown, userRootDir)
  }
}

function getFilePathAbsoluteUserRootDir2(filePathAbsoluteFilesystem: string, userRootDir: string): string {
  assert(filePathAbsoluteFilesystem.startsWith(userRootDir))
  let filePathAbsoluteUserRootDir = filePathAbsoluteFilesystem.slice(userRootDir.length)
  if (!filePathAbsoluteUserRootDir.startsWith('/')) filePathAbsoluteUserRootDir = '/' + filePathAbsoluteUserRootDir
  return filePathAbsoluteUserRootDir
}

function cleanFilePathUnkown(filePathUnknown: string) {
  filePathUnknown = toPosixPath(filePathUnknown)
  filePathUnknown = cleanModuleId(filePathUnknown)
  return filePathUnknown
}

function cleanModuleId(moduleId: string): string {
  // remove query
  const parts = moduleId.split('?')
  if (parts.length > 1) parts.pop()
  assert(parts.length >= 1)
  return parts.join('?')
}
