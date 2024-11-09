# Sat Parity Tracker

A real-time Bitcoin purchasing power tracker that monitors when different currencies reach "sat parity" - the point where 1 satoshi equals or exceeds 1 unit of that currency.

## Features

- **Real-time Exchange Rates**: Tracks Bitcoin exchange rates against multiple currencies
- **Parity Tracking**: Shows historical and predicted future parity dates for each currency
- **Visual Status**: Color-coded cards indicating parity status:
  - Blue: Already reached parity
  - Gold: Just hit parity
  - Red: Expected parity within 1 year
  - Orange: Expected parity within 4 years
  - Green: Expected parity beyond 4 years
- **Progress Tracker**: "The Sattening" progress bar showing the percentage of currencies that have reached sat parity
- **Bitcoin Integration**: Support the project with Bitcoin donations via Alby wallet integration
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Technical Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Alby Bitcoin Connect SDK

## Development

### Prerequisites

- Node.js
- Yarn or npm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/rolznz/satparity.git
cd satparity
```

2. Install dependencies:
```bash
yarn install
```

3. Start the development server:
```bash
yarn dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

```bash
yarn build
```

### Running Tests

```bash
yarn lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License. See LICENSE file for details.

## Acknowledgments

Built with PPQ.ai using the Cline VSCode plugin with Claude 3.5 Sonnet.
