# Temporal Voyager

**Temporal Voyager** is a "time machine" for your AlephNet node. It leverages the immutable history features of Gun.js to allow you to inspect, replay, and fork the state of your agents and data.

## Features

- **State Rewind**: Instantly revert the local view of the graph to any point in the past.
- **Event Replay**: Re-execute agent decision loops against historical data to see if the outcome changes (deterministic replay).
- **Timeline Forking**: Create a "What If" branch from a past state to test new agent behaviors without affecting the main timeline.
- **Causality Analysis**: Trace the chain of events that led to a specific state change.

## Usage

1.  Open the **Temporal Voyager** interface.
2.  Use the timeline scrubber to navigate through the node's history.
3.  Click on a specific timestamp to inspect the state of the Knowledge Graph at that moment.
4.  **To Replay**: Select a range of events and click "Replay in Sandbox".
5.  **To Fork**: Click "Branch Timeline" at the current cursor position.

## Technical Note

This plugin relies on the underlying storage adapter (e.g., RAD, sled) supporting historical queries. Performance may vary based on the size of the history log.

## License

MIT
