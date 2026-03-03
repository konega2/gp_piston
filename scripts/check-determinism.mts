const eventsModule = await import('../lib/events.ts');
const pipelineModule = await import('../lib/domain/event.pipeline.ts');

const getEvents =
  (eventsModule as { getEvents?: () => Promise<Array<{ id: string }>> }).getEvents ??
  ((eventsModule as { default?: { getEvents?: () => Promise<Array<{ id: string }>> } }).default?.getEvents);

const computeFullEvent =
  (pipelineModule as { computeFullEvent?: (eventId: string) => Promise<unknown> }).computeFullEvent ??
  ((pipelineModule as { default?: { computeFullEvent?: (eventId: string) => Promise<unknown> } }).default?.computeFullEvent);

if (typeof getEvents !== 'function') {
  throw new Error('getEvents export not found');
}

if (typeof computeFullEvent !== 'function') {
  throw new Error('computeFullEvent export not found');
}

const events = await getEvents();
if (events.length === 0) {
  console.log(JSON.stringify({ ok: false, reason: 'no-events' }));
  process.exit(0);
}

const eventId = events[0].id;
const serializedRuns: string[] = [];

for (let index = 0; index < 10; index += 1) {
  const computed = await computeFullEvent(eventId);
  serializedRuns.push(JSON.stringify(computed));
}

const baseline = serializedRuns[0];
const allEqual = serializedRuns.every((entry) => entry === baseline);

console.log(
  JSON.stringify({
    ok: true,
    eventId,
    runs: serializedRuns.length,
    allEqual
  })
);
