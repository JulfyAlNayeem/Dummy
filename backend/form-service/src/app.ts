import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import formRoutes from './routes/form.routes.js';

const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3006;
const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:3002';

app.use(helmet());
app.use(compression());
app.use(cors({ origin: ORIGIN_URL.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'form-service', uptime: process.uptime() }));
app.use('/api/forms', formRoutes);
app.use('/api/class-group/assignments', formRoutes);

server.listen(PORT, () => logger.info(`form-service running on port ${PORT}`));
export default app;
