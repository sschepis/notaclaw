# IoT Resonance Bridge

**IoT Resonance Bridge** extends the "Sentience Network" into the physical world. It allows AlephNet agents to perceive sensor data and control devices through integrations with Home Assistant, Matter, and Zigbee.

## Features

- **Device as Node**: Represents physical devices (lights, thermostats, locks) as semantic nodes in the Knowledge Graph.
- **Semantic Triggers**: Create rules like "If the 'Anxiety' vector in the room increases, dim the lights and play calming music."
- **Agent Control**: Allow agents to autonomously manage the environment based on their goals (e.g., "Optimize energy usage").
- **Sensor Fusion**: Aggregate data from multiple sensors to form high-level semantic observations (e.g., "The room is occupied and active").

## Integration

- **Home Assistant**: Connects via WebSocket API.
- **Matter**: Direct support for Matter-compliant devices (experimental).
- **MQTT**: Subscribe to custom sensor topics.

## Security

- **Permission Scopes**: Restrict which agents can control which devices.
- **Audit Logging**: All physical actions are cryptographically signed and logged to the mesh.
- **Fail-Safe**: Hard limits on device operations (e.g., max temperature, max volume).

## Usage

1.  Configure the connection to your Home Assistant instance.
2.  Select which entities to expose to the mesh.
3.  Assign semantic tags to devices (e.g., "Living Room", "Security").
4.  Agents can now query device state or request actions via the `iot` toolset.

## License

MIT
