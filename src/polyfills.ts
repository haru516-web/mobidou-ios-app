// three@0.186's CommonJS entry (pulled in by @react-three/fiber) calls process.emitWarning, which Hermes does not have.
// This runs before anything else is imported, so the call is a no-op instead of a crash on a device.
const nodeProcess = (globalThis as { process?: { emitWarning?: unknown } }).process;
if (nodeProcess && typeof nodeProcess.emitWarning !== 'function') nodeProcess.emitWarning = () => {};
