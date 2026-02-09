# Federated Trainer

**Federated Trainer** enables the AlephNet mesh to learn collectively without compromising individual node privacy. It orchestrates distributed training rounds where nodes update local models based on their private data and share only the weight gradients.

## Features

- **Privacy-Preserving**: Raw data never leaves the local node. Only mathematical model updates are shared.
- **Distributed Orchestration**: Automatically manages training rounds, peer selection, and model aggregation.
- **SLM Optimization**: Specialized for fine-tuning Small Language Models (SLMs) that can run on edge hardware.
- **Incentive Integration**: (Optional) Rewards nodes with tokens for contributing valid gradient updates.
- **Model Versioning**: Tracks the lineage of the global model in the Gun.js graph.

## How It Works

1.  **Initialization**: A training task is broadcast to the mesh (e.g., "Fine-tune on Python code").
2.  **Local Training**: Participating nodes train a local copy of the model on their private datasets.
3.  **Update Sharing**: Nodes compute the "delta" (gradients) and sign it with their Identity Key.
4.  **Aggregation**: Aggregator nodes (or the task initiator) combine the updates using Federated Averaging (FedAvg).
5.  **Distribution**: The new global model weights are published to the mesh.

## Usage

1.  Select a base model (e.g., Llama-3-8B-Quantized).
2.  Define the training dataset criteria (e.g., "All Markdown files in `/docs`").
3.  Set hyperparameters (learning rate, epochs, batch size).
4.  Click **Start Federated Round**.

## License

MIT
