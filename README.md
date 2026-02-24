# Avatar Client

A Next.js web application providing a 3D animated avatar interface for conversational AI interactions. The application renders a realistic 3D avatar with synchronized lip movements driven by Azure Neural TTS viseme data, enabling natural human-like conversations.

## Overview

The Avatar Client is a production-grade presentation layer that connects to a remote Brain API for conversational logic while handling all speech synthesis, 3D rendering, and animation locally. Built with The Horizon Standard architectural principles for enterprise-quality, security, and maintainability.

## Key Features

- **3D Avatar Rendering**: Realistic 3D avatars using react-three-fiber and Three.js with GLB model support
- **Viseme-Driven Lip Sync**: Precise mouth animation synchronized with speech within 50ms accuracy using Azure Neural TTS viseme data
- **Multi-Language Support**: Automatic voice selection for English, Spanish, French, German, Japanese, and Chinese
- **Agent Selection**: Switch between different AI personas with unique voices and characteristics
- **Real-Time Transcript**: Live conversation display with visual distinction between user and agent messages
- **Responsive Design**: Optimized layouts for desktop and mobile devices
- **Accessibility**: WCAG AA compliant with keyboard navigation and screen reader support
- **Production-Ready**: Comprehensive error handling, structured logging, and security headers

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **3D Rendering**: react-three-fiber, Three.js, @react-three/drei
- **State Management**: @tanstack/react-query (server state), Zustand (client state)
- **Speech Synthesis**: Azure Speech SDK (@microsoft/cognitiveservices-speech-sdk)
- **Styling**: Tailwind CSS
- **Testing**: Vitest, React Testing Library, Playwright, fast-check (property-based testing)
- **Code Quality**: ESLint, Prettier, Husky, lint-staged

## Architecture

The application follows a clean architecture with clear separation of concerns:

- **Presentation Layer**: React components for UI rendering
- **Business Logic Layer**: Services for TTS, viseme coordination, and audio management
- **Data Access Layer**: Repositories for Brain API and Azure Speech SDK communication
- **State Management**: Hybrid approach with React Query for server state and Zustand for client state

Key architectural patterns:
- Repository Pattern for API abstraction
- Service Layer for business logic
- Event-Driven Architecture for real-time synchronization
- Observer Pattern for audio-viseme coordination
- Strategy Pattern for multi-language voice selection

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Azure Speech Services account
- Brain API endpoint

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd avatar-client

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables (see Configuration section)
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Azure Speech Services
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=your_azure_region

# Brain API
BRAIN_API_URL=https://your-brain-api.com

# Client-side accessible variables
NEXT_PUBLIC_AVATAR_MODEL_URL=/models/avatar.glb
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Run type checking
tsc --noEmit
```

### Building for Production

```bash
# Build optimized production bundle
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app router pages
├── components/             # React components
│   ├── AvatarCanvas/      # 3D avatar rendering
│   ├── ChatInterface/     # Message input and history
│   ├── PersonaSwitcher/   # Agent selection dropdown
│   └── TranscriptDisplay/ # Real-time conversation text
├── services/              # Business logic services
│   ├── TTSService/        # Text-to-speech orchestration
│   ├── VisemeCoordinator/ # Animation synchronization
│   └── AudioManager/      # Audio playback control
├── repositories/          # Data access layer
│   ├── BrainApiRepository/    # Brain API communication
│   └── AzureSpeechRepository/ # Azure Speech SDK wrapper
├── stores/                # Zustand state stores
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

## Testing

The project uses a comprehensive dual testing approach:

- **Unit Tests**: Verify specific examples and edge cases
- **Property-Based Tests**: Verify universal properties across randomized inputs (100+ iterations)
- **Integration Tests**: Test API communication and component interactions
- **E2E Tests**: Validate critical user journeys with Playwright

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## API Integration

### Brain API Endpoints

**GET /api/agents**
- Retrieves list of available AI agents
- Response: `{ agents: Agent[] }`

**POST /api/chat**
- Sends user message and receives agent response
- Request: `{ agentId: string, message: string }`
- Response: `{ message: string, agentId: string, timestamp: string }`

### Azure Speech SDK

The application uses Azure Neural TTS for speech synthesis with viseme event tracking for lip synchronization. Supported voices include neural voices for English, Spanish, French, German, Japanese, and Chinese.

## Security

- Content-Security-Policy headers to prevent XSS attacks
- X-Frame-Options: DENY to prevent clickjacking
- X-Content-Type-Options: nosniff to prevent MIME sniffing
- Strict-Transport-Security headers to enforce HTTPS
- Input validation and sanitization
- Secrets stored in environment variables (never in source code)

## Accessibility

- ARIA labels for all interactive components
- Keyboard navigation support
- Screen reader announcements for messages and status changes
- WCAG AA color contrast compliance (4.5:1 minimum)
- Text alternatives for audio content

## Troubleshooting

### Avatar Model Not Loading
- Verify the GLB model file path in `NEXT_PUBLIC_AVATAR_MODEL_URL`
- Ensure the model contains viseme blendshape targets matching Azure viseme IDs
- Check browser console for detailed error messages

### Speech Synthesis Failing
- Verify Azure Speech credentials in environment variables
- Check Azure Speech service region matches your subscription
- Ensure network connectivity to Azure services
- Review browser console for Azure SDK error details

### API Connection Issues
- Verify Brain API URL is correct and accessible
- Check network connectivity and CORS configuration
- Review structured logs for detailed error information
- Ensure API endpoints return expected JSON format

## Contributing

This project follows conventional commit format:

```
type(scope): description

Examples:
feat(avatar): add blendshape interpolation
fix(tts): handle synthesis timeout errors
docs(readme): update installation instructions
```

Pre-commit hooks automatically run linting, formatting, and tests on staged files.

## License

[Your License Here]

## Documentation

For detailed technical documentation, see:
- [Requirements Document](.kiro/specs/avatar-client/requirements.md)
- [Design Document](.kiro/specs/avatar-client/design.md)
- [The Horizon Standard](docs/THE_HORIZON_STANDARD.md)

