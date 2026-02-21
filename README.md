# Pesafy 💳

> A powerful, type-safe payment gateway library for African payment systems, starting with M-Pesa Daraja API

[![npm version](https://img.shields.io/npm/v/pesafy.svg)](https://www.npmjs.com/package/pesafy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)

Pesafy simplifies payment processing for Kenyan merchants by providing a clean, well-documented, and easy-to-use interface for M-Pesa transactions. Built with TypeScript, following industry best practices inspired by Stripe.

## ✨ Features

- 🚀 **Easy Integration**: Simple, intuitive API design
- 🔒 **Type-Safe**: Full TypeScript support with comprehensive types
- 🎯 **Complete M-Pesa Coverage**: STK Push, B2C, B2B, C2B, QR Codes, and more
- 🔐 **Secure**: Built-in security credential encryption and webhook verification
- 🎨 **Dashboard Ready**: Payment monitoring and webhook management dashboard
- 🧩 **Component Library**: Reusable payment components for React/Vue
- 📚 **Well Documented**: Comprehensive documentation and examples
- ⚡ **Fast**: Built with Bun for optimal performance

## 📦 Installation

```bash
# Using npm
npm install pesafy

# Using yarn
yarn add pesafy

# Using pnpm
pnpm add pesafy

# Using bun
bun add pesafy
```

## 🚀 Quick Start

```typescript
import { Mpesa } from "pesafy";

const mpesa = new Mpesa({
  consumerKey: "your-consumer-key",
  consumerSecret: "your-consumer-secret",
  environment: "sandbox",
  lipaNaMpesaShortCode: "174379",
  lipaNaMpesaPassKey: "your-passkey",
});

// STK Push (M-Pesa Express)
const result = await mpesa.stkPush({
  amount: 100,
  phoneNumber: "254712345678",
  callbackUrl: "https://yoursite.com/callback",
  accountReference: "ORDER-123",
  transactionDesc: "Payment for order",
});
```

## 📚 Documentation

- **[Getting Started Guide](./docs/guides/getting-started.md)** - Learn how to set up Pesafy
- **[API Reference](./docs/api/)** - Complete API documentation
- **[Examples](./docs/examples/)** - Code examples for different frameworks
- **[Architecture](./ARCHITECTURE.md)** - System architecture overview
- **[Project Plan](./PROJECT_PLAN.md)** - Development roadmap

## 🎯 Supported APIs

### ✅ Available

- **STK Push (M-Pesa Express)** - Initiate payments via STK Push
- **STK Query** - Check STK Push transaction status
- **B2C** - Business to Customer payments
- **B2B** - Business to Business payments
- **C2B** - Register URLs & simulate (sandbox)
- **Dynamic QR Codes** - Generate LIPA NA M-PESA QR codes
- **Transaction Status** - Query transaction status
- **Reversal** - Reverse transactions

### 📦 Components

- **PaymentButton** - Simple button to trigger payments
- **PaymentForm** - Complete form for collecting payment details
- **QRCode** - Display M-Pesa dynamic QR codes
- **PaymentStatus** - Show payment status with visual feedback

## 🏗️ Project Structure

```
pesafy/
├── src/              # Source code
├── docs/             # Documentation
├── tests/            # Test files
├── examples/         # Example projects
└── components/       # Payment components (coming soon)
```

See [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) for detailed structure.

## 🧪 Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build the library
bun run build

# Run type checking
bun run typecheck

# Format code
bun run format

# Lint code
bun run lint
```

## 📊 Dashboard (SaaS)

Run the payment monitoring dashboard:

```bash
cd dashboard
bun install
bun run dev
```

Open http://localhost:3000 to view the dashboard. See [RUNNING.md](./RUNNING.md) for full instructions.

## 📝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔐 Security

For security concerns, please email [lewisodero27@gmail.com](mailto:lewisodero27@gmail.com) instead of using the issue tracker.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Safaricom Daraja API](https://developer.safaricom.co.ke/) - For providing the M-Pesa API
- Inspired by payment gateway patterns from Stripe and other industry leaders

## 📞 Support

- 📧 Email: [lewisodero27@gmail.com](mailto:lewisodero27@gmail.com)
- 🐛 Issues: [GitHub Issues](https://github.com/levos-snr/pesafy/issues)
- 📖 Documentation: [Full Documentation](./docs/)

## 🗺️ Roadmap

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the complete development roadmap.

**Phase 1** (Current): Core library foundation ✅  
**Phase 2**: Payment processing implementation 🚧  
**Phase 3**: Webhook management system 📅  
**Phase 4**: Dashboard development 📅  
**Phase 5**: Payment components 📅

---

Made with ❤️ for the African developer community
