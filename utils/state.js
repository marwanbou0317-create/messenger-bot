const engineState = {
  enabled: false,
  message: 'مرحباً! 👋',
  intervalSeconds: 60,
  smart: false,
  timers: new Map(),
  activityGroups: new Set(),
  targetThreadID: null,
};

const lockState = {
  smartLock: false,
  lockedGroups: new Set(),
};

function setEngineTarget(threadID) {
  engineState.targetThreadID = threadID;
}

function setEngineMessage(msg) {
  engineState.message = msg;
}

function setEngineInterval(seconds) {
  engineState.intervalSeconds = seconds;
}

function setEngineSmart(val) {
  engineState.smart = val;
}

function setEngineEnabled(val) {
  engineState.enabled = val;
}

function isLocked(threadID) {
  if (lockState.smartLock) return true;
  return lockState.lockedGroups.has(String(threadID));
}

function lockGroup(threadID) {
  lockState.lockedGroups.add(String(threadID));
}

function unlockGroup(threadID) {
  lockState.lockedGroups.delete(String(threadID));
}

function setSmartLock(val) {
  lockState.smartLock = val;
}

function markActivity(threadID) {
  engineState.activityGroups.add(String(threadID));
}

function hasActivity(threadID) {
  return engineState.activityGroups.has(String(threadID));
}

function clearActivity(threadID) {
  engineState.activityGroups.delete(String(threadID));
}

module.exports = {
  engineState,
  lockState,
  setEngineTarget,
  setEngineMessage,
  setEngineInterval,
  setEngineSmart,
  setEngineEnabled,
  isLocked,
  lockGroup,
  unlockGroup,
  setSmartLock,
  markActivity,
  hasActivity,
  clearActivity,
};
