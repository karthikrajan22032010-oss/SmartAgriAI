// ============================================================
// AI CONTROLLER — Handles AI recommendation requests
// API key is NEVER exposed to the frontend
// ============================================================

import { Request, Response } from 'express';
import { getAIRecommendation } from '../services/aiService';
import { PrismaClient } from '@prisma/client';
import { AIRecommendationRequest } from '../types';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export async function getRecommendation(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<AIRecommendationRequest>;

  // Validate required fields
  if (
    body.soilAverage === undefined ||
    body.temperature === undefined ||
    body.humidity === undefined ||
    body.waterLevel === undefined ||
    body.light === undefined
  ) {
    res.status(400).json({
      success: false,
      error: 'Missing required sensor data: soilAverage, temperature, humidity, waterLevel, light',
    });
    return;
  }

  const request: AIRecommendationRequest = {
    soilAverage: Number(body.soilAverage),
    soil1: body.soil1 !== undefined ? Number(body.soil1) : undefined,
    soil2: body.soil2 !== undefined ? Number(body.soil2) : undefined,
    temperature: Number(body.temperature),
    humidity: Number(body.humidity),
    waterLevel: Number(body.waterLevel),
    light: Number(body.light),
    language: body.language || 'en',
  };

  try {
    const result = await getAIRecommendation(request);

    // Persist recommendation to DB
    try {
      await prisma.aIRecommendation.create({
        data: {
          soilAverage: request.soilAverage,
          temperature: request.temperature,
          humidity: request.humidity,
          waterLevel: request.waterLevel,
          light: request.light,
          soilStatus: result.soilStatus,
          irrigation: result.irrigation,
          urgency: result.urgency,
          recommendation: result.recommendation,
          reason: result.reason,
          actions: JSON.stringify(result.actions),
          language: request.language || 'en',
        },
      });
    } catch (dbErr) {
      logger.warn('Could not persist AI recommendation', { error: (dbErr as Error).message });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('AI recommendation error', { error: (err as Error).message });
    res.status(500).json({
      success: false,
      error: 'AI service error',
      message: (err as Error).message,
    });
  }
}

export async function askQuestion(req: Request, res: Response): Promise<void> {
  const { question, sensorData, language } = req.body;
  if (!question || typeof question !== 'string') {
    res.status(400).json({ success: false, error: 'Question is required' });
    return;
  }

  try {
    const response = await import('../services/aiService').then(m => m.askAIQuestion({
      question,
      sensorData,
      language: language || 'en',
    }));
    res.json({ success: true, data: response });
  } catch (err) {
    logger.error('AI askQuestion error', { error: (err as Error).message });
    res.status(500).json({
      success: false,
      error: 'AI chat error',
      message: (err as Error).message,
    });
  }
}

