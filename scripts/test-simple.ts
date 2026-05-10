import { SandboxSelector } from './packages/sandbox/src/selector';
import { VirtualFileSystem } from './packages/vfs/src';

const profile = SandboxSelector.selectProfile("test", "architect", "low");
console.log("Profile Selected:", profile.runtime);

const vfs = new VirtualFileSystem();
console.log("VFS Mount:", vfs.getMountProfile("/work", "rw"));
