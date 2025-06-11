# Amgi AI - Korean Language Learning Assistant

Amgi AI is a modern web application designed to help users learn Korean language through AI-powered explanations and examples. The application leverages Google's Gemini AI model to provide detailed explanations of Korean terms, including translations, definitions, Hanja breakdowns, and example sentences.

## Features

- AI-powered Korean term explanations
- Detailed translations and definitions
- Hanja breakdowns (when available)
- Example sentences in both Korean and English
- Usage notes and cultural context
- Modern, responsive user interface

## Tech Stack

- **Frontend Framework**: Next.js 15.3.1
- **Language**: TypeScript
- **AI Integration**: Google Generative AI (Gemini)
- **Database**: Firebase
- **Styling**: Tailwind CSS
- **Testing**: Vitest

## Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn
- Google Cloud Platform account with Gemini API access
- Firebase project setup

## Getting Started

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd amgi-ai-2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:
   ```
   GOOGLE_API_KEY=your_gemini_api_key
   FIREBASE_CONFIG=your_firebase_config
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests with Vitest

## Project Structure

```
src/
├── app/          # Next.js app directory
├── components/   # React components
├── services/     # API and service integrations
└── config/       # Configuration files
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Generative AI (Gemini) for providing the AI capabilities
- Next.js team for the amazing framework
- Firebase for backend services 