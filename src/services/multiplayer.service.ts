import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import NodeCache from 'node-cache';
import { GameSessionModel, UserModel } from '@models';
import { logger } from '@utils';
import { ServiceSuccess, ServiceError, ServiceResult } from '@shared/types';
import type { GameRoom, GameRoomConfig, GameRoomPlayer, ChatMessage, GameRoomRound } from '@shared/types';
import { MESSAGE_KEYS } from '@shared/constants';
import { letterService } from './letter.service';
import { gameService } from './game.service';

class MultiplayerService extends EventEmitter {
  private static instance: MultiplayerService;
  private cache: NodeCache;

  private constructor() {
    super();
    // Cache settings: checkperiod = 60s, stdTTL = 24 hours
    this.cache = new NodeCache({ stdTTL: 86400, checkperiod: 60 });
    logger.info('MultiplayerService initialized');
  }

  public static getInstance(): MultiplayerService {
    if (!MultiplayerService.instance) {
      MultiplayerService.instance = new MultiplayerService();
    }
    return MultiplayerService.instance;
  }

  /**
   * Generate unique 6-character join code
   * Excludes similar characters: I, O, 0, 1
   */
  private generateJoinCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Generate unique join code (check for collisions)
   */
  private generateUniqueJoinCode(): string {
    let code = this.generateJoinCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (this.cache.has(`code:${code}`) && attempts < maxAttempts) {
      code = this.generateJoinCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique join code');
    }

    return code;
  }

  /**
   * Create a new game room
   * Username must be unique (verified before calling this)
   */
  public async createRoom(
    username: string,
    avatar: string
  ): Promise<ServiceResult<GameRoom>> {
    try {
      // Generate room ID and join code
      const roomId = uuidv4();
      const joinCode = this.generateUniqueJoinCode();

      // Create room with default config
      const room: GameRoom = {
        roomId,
        joinCode,
        hostId: username, // Use username as host identifier
        phase: 'waiting',
        players: new Map(),
        maxPlayers: 8,
        currentRound: 0,
        totalRounds: 4, // Default
        rounds: [],
        config: {
          roundsCount: 4,
          supportedCategories: ['name', 'place', 'animal', 'food'],
          excludedLetters: [],
        },
        chatMessages: [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      // Add host as first player
      const hostPlayer: GameRoomPlayer = {
        userId: null, // No userId required
        username,
        avatar,
        role: 'host',
        isGuest: true, // Treat all as guests for now
        status: 'active',
        currentScore: 0,
        answers: [],
        joinedAt: Date.now(),
        lastActivity: Date.now(),
      };

      room.players.set(username, hostPlayer);

      // Store in cache
      this.cache.set(roomId, room);
      this.cache.set(`code:${joinCode}`, roomId);

      // Background: Persist to MongoDB
      setImmediate(async () => {
        try {
          await GameSessionModel.create({
            roomId,
            joinCode,
            hostId: username, // Use username as host identifier
            players: [
              {
                userId: null, // No userId
                username,
                isGuest: true,
                joinedAt: new Date(),
              },
            ],
            config: {
              roundsCount: room.config.roundsCount,
              supportedCategories: room.config.supportedCategories,
              excludedLetters: room.config.excludedLetters,
            },
            roundResults: [],
            finalScores: [],
            status: 'active',
            createdAt: new Date(),
          });
          logger.info(`Game session persisted to DB: ${roomId}`);
        } catch (error: any) {
          logger.error(`Failed to persist game session: ${error.message}`);
        }
      });

      // Emit event
      this.emit('room:created', { room });

      logger.info(`Room created: ${roomId} with code ${joinCode} by ${username}`);

      return new ServiceSuccess(room, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error creating room', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Join an existing room
   */
  public async joinRoom(
    joinCode: string,
    username: string,
    avatar?: string
  ): Promise<ServiceResult<GameRoom>> {
    try {
      // Get room by join code
      const roomId = this.cache.get<string>(`code:${joinCode.toUpperCase()}`);
      if (!roomId) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Check if room is in waiting phase
      if (room.phase !== 'waiting') {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // Check if room is full
      if (room.players.size >= room.maxPlayers) {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // Default avatar if not provided
      const playerAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

      // Add player to room
      const newPlayer: GameRoomPlayer = {
        userId: null,
        username,
        avatar: playerAvatar,
        role: 'player',
        isGuest: true,
        status: 'active',
        currentScore: 0,
        answers: [],
        joinedAt: Date.now(),
        lastActivity: Date.now(),
      };

      room.players.set(username, newPlayer);
      room.lastActivity = Date.now();

      // Update cache
      this.cache.set(roomId, room);

      // Background: Update MongoDB
      setImmediate(async () => {
        try {
          await GameSessionModel.updateOne(
            { roomId },
            {
              $push: {
                players: {
                  userId: null,
                  username,
                  isGuest: true,
                  joinedAt: new Date(),
                },
              },
            }
          );
          logger.info(`Player ${username} persisted to DB for room ${roomId}`);
        } catch (error: any) {
          logger.error(`Failed to persist player join: ${error.message}`);
        }
      });

      // Emit event for broadcasting
      this.emit('player:joined', { roomId, username, avatar: playerAvatar });

      logger.info(`Player ${username} joined room ${roomId}`);

      return new ServiceSuccess(room, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error joining room', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Leave a room
   */
  public async leaveRoom(roomId: string, username: string): Promise<ServiceResult<void>> {
    try {
      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      const player = room.players.get(username);
      if (!player) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Remove player
      room.players.delete(username);

      // If host leaves, assign new host or delete room
      if (room.hostId === username) {
        if (room.players.size > 0) {
          // Assign first remaining player as new host
          const newHost = Array.from(room.players.values())[0];
          newHost.role = 'host';
          room.hostId = newHost.username;
          logger.info(`New host assigned: ${newHost.username} for room ${roomId}`);
        } else {
          // No players left, delete room
          this.cache.del(roomId);
          this.cache.del(`code:${room.joinCode}`);
          logger.info(`Room ${roomId} deleted - no players remaining`);

          // Update MongoDB status
          setImmediate(async () => {
            try {
              await GameSessionModel.updateOne({ roomId }, { status: 'abandoned' });
            } catch (error: any) {
              logger.error(`Failed to update room status: ${error.message}`);
            }
          });

          this.emit('room:deleted', { roomId });
          return new ServiceSuccess(undefined, MESSAGE_KEYS.SUCCESS);
        }
      }

      room.lastActivity = Date.now();
      this.cache.set(roomId, room);

      // Emit event
      this.emit('player:left', { roomId, username, newHostId: room.hostId });

      logger.info(`Player ${username} left room ${roomId}`);

      return new ServiceSuccess(undefined, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error leaving room', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Rejoin an existing room (for reconnection scenarios)
   * Allows same username to reconnect if they disconnected or refreshed
   */
  public async rejoinRoom(
    joinCode: string,
    username: string,
    avatar?: string
  ): Promise<ServiceResult<GameRoom>> {
    try {
      const roomId = this.cache.get<string>(`code:${joinCode.toUpperCase()}`);
      if (!roomId) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }


      // Check if player exists in room
      const existingPlayer = room.players.get(username);
      if (!existingPlayer) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Update player status to active
      existingPlayer.status = 'active';
      existingPlayer.lastActivity = Date.now();

      // Update avatar if provided
      if (avatar) {
        existingPlayer.avatar = avatar;
      }

      room.lastActivity = Date.now();
      this.cache.set(roomId, room);

      // Emit event for broadcasting
      this.emit('player:rejoined', {
        roomId,
        username,
        avatar: existingPlayer.avatar,
        currentScore: existingPlayer.currentScore,
        phase: room.phase
      });

      logger.info(`Player ${username} rejoined room ${roomId}`);

      return new ServiceSuccess(room, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error rejoining room', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Send chat message
   */
  public async sendChatMessage(
    roomId: string,
    username: string,
    message: string
  ): Promise<ServiceResult<ChatMessage>> {
    try {
      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Validate player is in room (authorization gate)
      if (!this.validatePlayerInRoom(room, username)) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      const player = room.players.get(username);
      if (!player) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Validate message length
      if (message.length === 0 || message.length > 200) {
        return new ServiceError(MESSAGE_KEYS.VALIDATION_FAILED, MESSAGE_KEYS.VALIDATION_FAILED);
      }

      // Create chat message
      const chatMessage: ChatMessage = {
        messageId: uuidv4(),
        userId: player.userId || username,
        username,
        message,
        timestamp: Date.now(),
      };

      // Add to room (keep last 50 messages)
      room.chatMessages.push(chatMessage);
      if (room.chatMessages.length > 50) {
        room.chatMessages.shift(); // Remove oldest message
      }

      room.lastActivity = Date.now();
      this.cache.set(roomId, room);

      // Emit event for broadcasting
      this.emit('chat:message', { roomId, message: chatMessage });

      logger.debug(`Chat message from ${username} in room ${roomId}`);

      return new ServiceSuccess(chatMessage, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error sending chat message', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get room by ID
   */
  public getRoom(roomId: string): GameRoom | undefined {
    return this.cache.get<GameRoom>(roomId);
  }

  /**
   * Get room by join code
   */
  public getRoomByCode(joinCode: string): GameRoom | undefined {
    const roomId = this.cache.get<string>(`code:${joinCode.toUpperCase()}`);
    if (!roomId) {
      return undefined;
    }
    return this.cache.get<GameRoom>(roomId);
  }

  /**
   * Update room in cache
   */
  public updateRoom(room: GameRoom): void {
    room.lastActivity = Date.now();
    this.cache.set(room.roomId, room);
  }

  /**
   * Validate player is in room (authorization gate)
   */
  private validatePlayerInRoom(room: GameRoom, username: string): boolean {
    return room.players.has(username);
  }

  /**
   * Update game config (host only, before game starts)
   */
  public async updateConfig(
    roomId: string,
    username: string,
    config: GameRoomConfig
  ): Promise<ServiceResult<GameRoom>> {
    try {
      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Validate player is in room
      if (!this.validatePlayerInRoom(room, username)) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      // Only host can update config
      if (room.hostId !== username) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      // Can only update config in waiting phase
      if (room.phase !== 'waiting') {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // Validate config
      if (config.roundsCount < 1 || config.roundsCount > 10) {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      if (!config.supportedCategories || config.supportedCategories.length === 0) {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // Update config
      room.config = {
        roundsCount: config.roundsCount,
        supportedCategories: config.supportedCategories,
        excludedLetters: config.excludedLetters || [],
      };
      room.totalRounds = config.roundsCount;
      room.lastActivity = Date.now();

      // Update cache
      this.cache.set(roomId, room);

      // Emit event for broadcasting
      this.emit('config:updated', {
        roomId,
        config: room.config,
      });

      logger.info(`Config updated for room ${roomId} by ${username}`);

      return new ServiceSuccess(room, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error updating config', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Start the game and generate rounds
   */
  public async startGame(
    roomId: string,
    username: string,
    config?: GameRoomConfig
  ): Promise<ServiceResult<GameRoom>> {
    try {
      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Validate player is in room
      if (!this.validatePlayerInRoom(room, username)) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      // Only host can start the game
      if (room.hostId !== username) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      // Must be in waiting phase
      if (room.phase !== 'waiting') {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // Must have at least 1 player (host counts)
      if (room.players.size < 1) {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // If config provided, update it first
      if (config) {
        // Validate config
        if (config.roundsCount < 1 || config.roundsCount > 10) {
          return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
        }

        if (!config.supportedCategories || config.supportedCategories.length === 0) {
          return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
        }

        room.config = {
          roundsCount: config.roundsCount,
          supportedCategories: config.supportedCategories,
          excludedLetters: config.excludedLetters || [],
        };
        room.totalRounds = config.roundsCount;
      }

      // Generate rounds
      const rounds = this.generateRounds(room.config);
      if (rounds.length === 0) {
        return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
      }

      room.rounds = rounds;
      room.currentRound = 1;
      room.phase = 'starting';
      room.startedAt = Date.now();
      room.lastActivity = Date.now();

      // Update cache
      this.cache.set(roomId, room);

      // Background: Update MongoDB
      setImmediate(async () => {
        try {
          await GameSessionModel.updateOne(
            { roomId },
            {
              status: 'in_progress',
              startedAt: new Date(),
            }
          );
          logger.info(`Game started in DB for room ${roomId}`);
        } catch (error: any) {
          logger.error(`Failed to update game start: ${error.message}`);
        }
      });

      // Emit event for broadcasting
      this.emit('game:started', {
        roomId,
        round: rounds[0],
        totalRounds: rounds.length,
      });

      logger.info(`Game started for room ${roomId} with ${rounds.length} rounds`);

      return new ServiceSuccess(room, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error starting game', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Submit answers for the current round
   */
  public async submitAnswers(
    roomId: string,
    username: string,
    answers: Array<{
      letter: string;
      word: string;
      category: string;
      timeLeft: number;
    }>
  ): Promise<ServiceResult<{
    results: Array<{
      valid: boolean;
      wordScore: number;
      wordBonus: number;
      totalScore: number;
      word: string;
      category: string;
      letter: string;
      comment?: string;
    }>;
    roundScore: number;
    totalScore: number;
  }>> {
    try {
      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Validate player is in room
      if (!this.validatePlayerInRoom(room, username)) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      const player = room.players.get(username);
      if (!player) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Must be in playing phase
      if (room.phase !== 'playing') {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // Validate current round
      if (room.currentRound < 1 || room.currentRound > room.rounds.length) {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      const currentRound = room.rounds[room.currentRound - 1];

      // Check if player already submitted for this round
      if (currentRound.submissions.has(username)) {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // Validate answers using existing game service
      const validationResult = await gameService.validateAnswers(answers);

      if (!validationResult.success || !validationResult.data) {
        return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
      }

      const validatedAnswers = validationResult.data;

      // Calculate round score
      let roundScore = 0;
      for (const result of validatedAnswers) {
        roundScore += result.totalScore;
      }

      // Update player answers and score
      for (let i = 0; i < validatedAnswers.length; i++) {
        const result = validatedAnswers[i];
        const originalAnswer = answers[i];

        player.answers.push({
          roundNumber: room.currentRound,
          letter: result.letter,
          word: result.word,
          category: result.category,
          timeLeft: originalAnswer.timeLeft,
          score: result.totalScore,
          valid: result.valid,
        });
      }

      player.currentScore += roundScore;
      player.lastActivity = Date.now();

      // Mark submission
      currentRound.submissions.set(username, true);

      // Update room
      room.lastActivity = Date.now();
      this.cache.set(roomId, room);

      // Check if all players have submitted
      const allSubmitted = room.players.size === currentRound.submissions.size;

      // Emit events
      this.emit('answer:submitted', {
        roomId,
        username,
        submitted: currentRound.submissions.size,
        total: room.players.size,
        allSubmitted,
      });

      if (allSubmitted) {
        // Automatically move to round_end phase
        room.phase = 'round_end';
        this.cache.set(roomId, room);

        this.emit('round:ended', {
          roomId,
          roundNumber: room.currentRound,
        });
      }

      logger.info(`Player ${username} submitted answers for round ${room.currentRound} in room ${roomId}`);

      return new ServiceSuccess({
        results: validatedAnswers,
        roundScore,
        totalScore: player.currentScore,
      }, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error submitting answers', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get round results (all players' answers for review)
   */
  public async getRoundResults(
    roomId: string,
    username: string,
    roundNumber?: number
  ): Promise<ServiceResult<{
    roundNumber: number;
    letter: string;
    categories: string[];
    players: Array<{
      username: string;
      avatar: string;
      answers: Array<{
        category: string;
        word: string;
        valid: boolean;
        score: number;
        timeLeft: number;
      }>;
      roundScore: number;
      totalScore: number;
    }>;
  }>> {
    try {
      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Validate player is in room
      if (!this.validatePlayerInRoom(room, username)) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      // Default to current round if not specified
      const targetRound = roundNumber || room.currentRound;

      if (targetRound < 1 || targetRound > room.rounds.length) {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      const round = room.rounds[targetRound - 1];

      // Build player results
      const playerResults = Array.from(room.players.values()).map(player => {
        const roundAnswers = player.answers.filter(a => a.roundNumber === targetRound);
        const roundScore = roundAnswers.reduce((sum, a) => sum + a.score, 0);

        return {
          username: player.username,
          avatar: player.avatar,
          answers: roundAnswers.map(a => ({
            category: a.category,
            word: a.word,
            valid: a.valid,
            score: a.score,
            timeLeft: a.timeLeft,
          })),
          roundScore,
          totalScore: player.currentScore,
        };
      });

      // Sort by round score descending
      playerResults.sort((a, b) => b.roundScore - a.roundScore);

      return new ServiceSuccess({
        roundNumber: targetRound,
        letter: round.letter,
        categories: round.categories.map(c => c.name),
        players: playerResults,
      }, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error getting round results', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Proceed to next round (host only)
   */
  public async nextRound(roomId: string, username: string): Promise<ServiceResult<GameRoom>> {
    try {
      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Validate player is in room
      if (!this.validatePlayerInRoom(room, username)) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      // Only host can proceed
      if (room.hostId !== username) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      // Must be in round_end phase
      if (room.phase !== 'round_end') {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // Check if there are more rounds
      if (room.currentRound >= room.rounds.length) {
        // Game is finished
        room.phase = 'finished';

        // Calculate winner
        const players = Array.from(room.players.values());
        players.sort((a, b) => b.currentScore - a.currentScore);

        if (players.length > 0) {
          const winner = players[0];
          room.winner = {
            userId: winner.userId || winner.username,
            username: winner.username,
            score: winner.currentScore,
          };
        }

        this.cache.set(roomId, room);

        // Background: Persist game completion to MongoDB
        setImmediate(async () => {
          try {
            await this.persistGameCompletion(room);
          } catch (error: any) {
            logger.error(`Failed to persist game completion: ${error.message}`);
          }
        });

        // Emit game finished event
        this.emit('game:finished', {
          roomId,
          winner: room.winner,
        });

        logger.info(`Game finished for room ${roomId}`);
      } else {
        // Move to next round
        room.currentRound++;
        room.phase = 'playing';
        room.rounds[room.currentRound - 1].startedAt = Date.now();
        room.lastActivity = Date.now();

        this.cache.set(roomId, room);

        // Emit round started event
        this.emit('round:started', {
          roomId,
          round: room.rounds[room.currentRound - 1],
          roundNumber: room.currentRound,
          totalRounds: room.rounds.length,
        });

        logger.info(`Round ${room.currentRound} started for room ${roomId}`);
      }

      return new ServiceSuccess(room, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error proceeding to next round', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * End game early and return to lobby (host only)
   */
  public async endGame(roomId: string, username: string): Promise<ServiceResult<GameRoom>> {
    try {
      const room = this.cache.get<GameRoom>(roomId);

      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Validate player is in room
      if (!this.validatePlayerInRoom(room, username)) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      // Only host can end the game
      if (room.hostId !== username) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      // Can only end if game is in progress (not waiting or already finished)
      if (room.phase === 'waiting') {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // Reset room to waiting state
      room.phase = 'waiting';
      room.currentRound = 0;
      room.rounds = [];
      room.startedAt = undefined;
      room.winner = undefined;
      room.lastActivity = Date.now();

      // Reset all player scores and answers
      room.players.forEach((player) => {
        player.currentScore = 0;
        player.answers = [];
      });

      // Update cache
      this.cache.set(roomId, room);

      // Background: Update MongoDB
      setImmediate(async () => {
        try {
          await GameSessionModel.updateOne(
            { roomId },
            {
              $set: {
                status: 'cancelled',
                completedAt: new Date(),
              },
            }
          );
          logger.info(`Game ended early (cancelled) in DB for room ${roomId}`);
        } catch (error: any) {
          logger.error(`Failed to update game end: ${error.message}`);
        }
      });

      // Emit event for broadcasting
      this.emit('game:ended', {
        roomId,
        endedBy: username,
      });

      logger.info(`Game ended early by host ${username} in room ${roomId}`);

      return new ServiceSuccess(room, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error ending game', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get game summary (after game finished) - Enhanced version with all fields
   */
  public async getGameSummary(
    roomId: string,
    username: string
  ): Promise<ServiceResult<any>> {
    try {
      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return new ServiceError(MESSAGE_KEYS.NOT_FOUND, MESSAGE_KEYS.NOT_FOUND);
      }

      // Validate player is in room
      if (!this.validatePlayerInRoom(room, username)) {
        return new ServiceError(MESSAGE_KEYS.UNAUTHORIZED, MESSAGE_KEYS.UNAUTHORIZED);
      }

      // Game must be finished or in the last round_end phase
      if (room.phase !== 'finished' && room.phase !== 'round_end') {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // If in round_end, must be the final round
      if (room.phase === 'round_end' && room.currentRound < room.rounds.length) {
        return new ServiceError(MESSAGE_KEYS.BAD_REQUEST, MESSAGE_KEYS.BAD_REQUEST);
      }

      // Build enhanced player summaries
      const players = Array.from(room.players.values()).map(player => {
        const roundScores: number[] = [];
        const validAnswersCount = player.answers.filter(a => a.valid).length;
        const invalidAnswersCount = player.answers.filter(a => !a.valid).length;
        const totalAnswersCount = player.answers.length;

        // Calculate round scores
        for (let i = 1; i <= room.rounds.length; i++) {
          const roundAnswers = player.answers.filter(a => a.roundNumber === i);
          const roundScore = roundAnswers.reduce((sum, a) => sum + a.score, 0);
          roundScores.push(roundScore);
        }

        // Calculate average time (timeLeft)
        const totalTime = player.answers.reduce((sum, a) => sum + a.timeLeft, 0);
        const averageTime = totalAnswersCount > 0 ? totalTime / totalAnswersCount : 0;

        // Calculate longest streak of correct answers
        let longestStreak = 0;
        let currentStreak = 0;
        player.answers.forEach(answer => {
          if (answer.valid) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
          } else {
            currentStreak = 0;
          }
        });

        // Calculate category breakdown
        const categoryMap = new Map<string, { correct: number; total: number }>();
        player.answers.forEach(answer => {
          if (!categoryMap.has(answer.category)) {
            categoryMap.set(answer.category, { correct: 0, total: 0 });
          }
          const catData = categoryMap.get(answer.category)!;
          catData.total++;
          if (answer.valid) catData.correct++;
        });

        const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          correct: data.correct,
          total: data.total,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        }));

        return {
          username: player.username,
          avatar: player.avatar,
          totalScore: player.currentScore,
          roundScores,
          correctAnswers: validAnswersCount,
          validAnswers: validAnswersCount, // Keep both for compatibility
          invalidAnswers: invalidAnswersCount,
          totalAnswers: totalAnswersCount,
          accuracy: totalAnswersCount > 0 ? Math.round((validAnswersCount / totalAnswersCount) * 100) : 0,
          averageTime: Math.round(averageTime * 100) / 100,
          longestStreak,
          averageScore: roundScores.length > 0 ? Math.round(roundScores.reduce((a, b) => a + b, 0) / roundScores.length) : 0,
          bestRound: roundScores.length > 0 ? Math.max(...roundScores) : 0,
          worstRound: roundScores.length > 0 ? Math.min(...roundScores) : 0,
          categoryBreakdown,
        };
      });

      // Sort by total score and assign ranks
      players.sort((a, b) => b.totalScore - a.totalScore);
      const rankedPlayers = players.map((p, index) => ({
        ...p,
        rank: index + 1,
      }));

      // Build detailed round-by-round breakdown
      const roundByRound = room.rounds.map((round, index) => {
        const roundNumber = index + 1;

        const playerRoundData = Array.from(room.players.values()).map(player => {
          const roundAnswers = player.answers.filter(a => a.roundNumber === roundNumber);
          const roundScore = roundAnswers.reduce((sum, a) => sum + a.score, 0);

          return {
            username: player.username,
            avatar: player.avatar,
            roundScore,
            answers: roundAnswers.map(a => ({
              category: a.category,
              word: a.word,
              valid: a.valid,
              score: a.score,
            })),
          };
        });

        // Sort by round score
        playerRoundData.sort((a, b) => b.roundScore - a.roundScore);

        return {
          roundNumber,
          letter: round.letter,
          categories: round.categories.map(c => c.name),
          players: playerRoundData,
        };
      });

      // Build simplified rounds summary with leaderboard
      const rounds = room.rounds.map((round, index) => {
        const roundNumber = index + 1;

        const leaderboard = Array.from(room.players.values()).map(player => {
          const roundAnswers = player.answers.filter(a => a.roundNumber === roundNumber);
          const roundScore = roundAnswers.reduce((sum, a) => sum + a.score, 0);

          return {
            username: player.username,
            roundScore,
          };
        }).sort((a, b) => b.roundScore - a.roundScore);

        return {
          roundNumber,
          letter: round.letter,
          leaderboard,
        };
      });

      // Calculate aggregate stats
      let totalAnswers = 0;
      let validAnswers = 0;
      let invalidAnswers = 0;
      const allRoundScores: number[] = [];
      const categoryStats = new Map<string, { correct: number; total: number }>();
      let fastestAnswer: { username: string; time: number; word: string; category: string } | null = null;
      let maxTimeLeft = -1;

      for (const player of room.players.values()) {
        totalAnswers += player.answers.length;
        validAnswers += player.answers.filter(a => a.valid).length;
        invalidAnswers += player.answers.filter(a => !a.valid).length;

        // Track round scores
        for (let i = 1; i <= room.rounds.length; i++) {
          const roundAnswers = player.answers.filter(a => a.roundNumber === i);
          const roundScore = roundAnswers.reduce((sum, a) => sum + a.score, 0);
          allRoundScores.push(roundScore);
        }

        // Track category stats
        player.answers.forEach(answer => {
          if (!categoryStats.has(answer.category)) {
            categoryStats.set(answer.category, { correct: 0, total: 0 });
          }
          const catData = categoryStats.get(answer.category)!;
          catData.total++;
          if (answer.valid) catData.correct++;
        });

        // Track fastest answer
        player.answers.forEach(answer => {
          if (answer.valid && answer.timeLeft > maxTimeLeft) {
            maxTimeLeft = answer.timeLeft;
            fastestAnswer = {
              username: player.username,
              time: answer.timeLeft,
              word: answer.word,
              category: answer.category,
            };
          }
        });
      }

      const averageScore = allRoundScores.length > 0
        ? allRoundScores.reduce((sum, s) => sum + s, 0) / allRoundScores.length
        : 0;

      const highestRoundScore = allRoundScores.length > 0 ? Math.max(...allRoundScores) : 0;
      const lowestRoundScore = allRoundScores.length > 0 ? Math.min(...allRoundScores) : 0;

      // Find hardest and easiest categories
      let hardestCategory: { name: string; accuracy: number; totalAttempts: number } | null = null;
      let easiestCategory: { name: string; accuracy: number; totalAttempts: number } | null = null;
      let minAccuracy = 101;
      let maxAccuracy = -1;

      categoryStats.forEach((data, category) => {
        const accuracy = (data.correct / data.total) * 100;
        if (accuracy < minAccuracy) {
          minAccuracy = accuracy;
          hardestCategory = {
            name: category,
            accuracy: Math.round(accuracy),
            totalAttempts: data.total,
          };
        }
        if (accuracy > maxAccuracy) {
          maxAccuracy = accuracy;
          easiestCategory = {
            name: category,
            accuracy: Math.round(accuracy),
            totalAttempts: data.total,
          };
        }
      });

      // Get winner data with avatar
      const winnerPlayer = rankedPlayers.length > 0 ? rankedPlayers[0] : null;
      const winner = room.winner ? {
        username: room.winner.username,
        avatar: winnerPlayer?.avatar || '',
        score: room.winner.score,
      } : (winnerPlayer ? {
        username: winnerPlayer.username,
        avatar: winnerPlayer.avatar,
        score: winnerPlayer.totalScore,
      } : null);

      return new ServiceSuccess({
        roomId: room.roomId,
        totalRounds: room.rounds.length,
        winner,
        players: rankedPlayers,
        rounds, // Simplified version with leaderboard
        roundByRound, // Detailed version (existing)
        stats: {
          totalAnswers,
          totalWords: totalAnswers, // Alias
          validAnswers,
          invalidAnswers,
          averageScore: Math.round(averageScore),
          highestRoundScore,
          lowestRoundScore,
        },
        gameStats: {
          totalWords: totalAnswers,
          fastestAnswer,
          hardestCategory,
          easiestCategory,
        },
        timestamp: Date.now(),
      }, MESSAGE_KEYS.SUCCESS);
    } catch (error: any) {
      logger.error('Error getting game summary', error);
      return new ServiceError(MESSAGE_KEYS.INTERNAL_SERVER_ERROR, MESSAGE_KEYS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Persist game completion to MongoDB
   */
  private async persistGameCompletion(room: GameRoom): Promise<void> {
    try {
      // Build round results
      const roundResults = room.rounds.map((round, index) => {
        const roundNumber = index + 1;

        // Get all players' answers for this round
        const playerAnswers = Array.from(room.players.values()).map(player => {
          const roundAnswers = player.answers.filter(a => a.roundNumber === roundNumber);
          const roundScore = roundAnswers.reduce((sum, a) => sum + a.score, 0);

          return {
            username: player.username,
            answers: roundAnswers.map(a => ({
              category: a.category,
              word: a.word,
              valid: a.valid,
              score: a.score,
              timeLeft: a.timeLeft,
            })),
            score: roundScore,
          };
        });

        return {
          roundNumber,
          letter: round.letter,
          categories: round.categories.map(c => c.name),
          startedAt: round.startedAt ? new Date(round.startedAt) : new Date(),
          playerAnswers,
        };
      });

      // Build final scores
      const finalScores = Array.from(room.players.values())
        .map(player => ({
          username: player.username,
          score: player.currentScore,
          answersCount: player.answers.length,
          validAnswersCount: player.answers.filter(a => a.valid).length,
        }))
        .sort((a, b) => b.score - a.score);

      // Update game session
      await GameSessionModel.updateOne(
        { roomId: room.roomId },
        {
          $set: {
            status: 'completed',
            completedAt: new Date(),
            roundResults,
            finalScores,
            winner: room.winner ? {
              username: room.winner.username,
              score: room.winner.score,
            } : undefined,
          },
        }
      );

      logger.info(`Game completion persisted for room ${room.roomId}`);
    } catch (error: any) {
      logger.error('Error persisting game completion', error);
      throw error;
    }
  }

  /**
   * Cleanup inactive rooms (called periodically)
   */
  public cleanupInactiveRooms(inactiveThresholdMs: number = 30 * 60 * 1000): number {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      const allKeys = this.cache.keys();

      for (const key of allKeys) {
        // Skip non-room keys (code: keys)
        if (key.startsWith('code:')) {
          continue;
        }

        const room = this.cache.get<GameRoom>(key);
        if (!room) {
          continue;
        }

        // Check if room is inactive
        const inactiveDuration = now - room.lastActivity;

        if (inactiveDuration > inactiveThresholdMs) {
          // Delete from cache
          this.cache.del(room.roomId);
          this.cache.del(`code:${room.joinCode}`);

          // Update MongoDB status
          setImmediate(async () => {
            try {
              await GameSessionModel.updateOne(
                { roomId: room.roomId },
                { status: 'abandoned', completedAt: new Date() }
              );
            } catch (error: any) {
              logger.error(`Failed to update abandoned room status: ${error.message}`);
            }
          });

          // Emit room deleted event
          this.emit('room:deleted', { roomId: room.roomId });

          cleanedCount++;
          logger.info(`Cleaned up inactive room ${room.roomId} (inactive for ${Math.round(inactiveDuration / 1000 / 60)} minutes)`);
        }
      }

      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} inactive room(s)`);
      }

      return cleanedCount;
    } catch (error: any) {
      logger.error('Error cleaning up inactive rooms', error);
      return 0;
    }
  }

  /**
   * Mark player as disconnected (to be called on socket disconnect)
   */
  public markPlayerDisconnected(socketId: string): void {
    try {
      const allKeys = this.cache.keys();

      for (const key of allKeys) {
        if (key.startsWith('code:')) {
          continue;
        }

        const room = this.cache.get<GameRoom>(key);
        if (!room) {
          continue;
        }

        // Find player by socket ID
        for (const player of room.players.values()) {
          if (player.socketId === socketId) {
            player.status = 'disconnected';
            room.lastActivity = Date.now();
            this.cache.set(room.roomId, room);

            logger.info(`Player ${player.username} marked as disconnected in room ${room.roomId}`);

            // Emit player disconnected event
            this.emit('player:disconnected', {
              roomId: room.roomId,
              username: player.username,
            });

            return;
          }
        }
      }
    } catch (error: any) {
      logger.error('Error marking player as disconnected', error);
    }
  }

  /**
   * Reconnect player (to be called when player reconnects)
   */
  public reconnectPlayer(roomId: string, username: string, socketId: string): boolean {
    try {
      const room = this.cache.get<GameRoom>(roomId);
      if (!room) {
        return false;
      }

      const player = room.players.get(username);
      if (!player) {
        return false;
      }

      player.status = 'active';
      player.socketId = socketId;
      player.lastActivity = Date.now();
      room.lastActivity = Date.now();

      this.cache.set(roomId, room);

      logger.info(`Player ${username} reconnected to room ${roomId}`);

      // Emit player reconnected event
      this.emit('player:reconnected', {
        roomId,
        username,
      });

      return true;
    } catch (error: any) {
      logger.error('Error reconnecting player', error);
      return false;
    }
  }

  /**
   * Generate rounds based on game configuration
   */
  private generateRounds(config: GameRoomConfig): GameRoomRound[] {
    try {
      const rounds: GameRoomRound[] = [];
      const { roundsCount, supportedCategories, excludedLetters } = config;

      // Get all available letters
      const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

      // Filter out excluded letters
      const availableLetters = allLetters.filter(
        letter => !excludedLetters.includes(letter)
      );

      if (availableLetters.length < roundsCount) {
        logger.warn(`Not enough letters after exclusions. Available: ${availableLetters.length}, Needed: ${roundsCount}`);
        // Use what we have
      }

      // Shuffle letters
      const shuffledLetters = availableLetters.sort(() => Math.random() - 0.5);

      // Select letters that have valid categories
      const selectedLetters: string[] = [];
      for (const letter of shuffledLetters) {
        if (selectedLetters.length >= roundsCount) {
          break;
        }

        // Check if this letter has at least 3 valid categories
        const validCategories = letterService.getValidCategoriesForLetter(
          letter,
          supportedCategories,
          3
        );

        if (validCategories.length >= 3) {
          selectedLetters.push(letter);
        }
      }

      // Generate rounds with random categories
      for (let i = 0; i < selectedLetters.length; i++) {
        const letter = selectedLetters[i];
        const validCategories = letterService.getValidCategoriesForLetter(
          letter,
          supportedCategories,
          3
        );

        // Select 3-5 random categories for this round
        const categoryCount = Math.floor(Math.random() * 3) + 3; // 3, 4, or 5
        const shuffledCategories = validCategories.sort(() => Math.random() - 0.5);
        const roundCategories = shuffledCategories.slice(0, Math.min(categoryCount, validCategories.length));

        const round: GameRoomRound = {
          roundNumber: i + 1,
          letter,
          categories: roundCategories.map(cat => ({
            name: cat,
            displayName: cat.charAt(0).toUpperCase() + cat.slice(1),
            timeLimit: 30, // 60 seconds per round
          })),
          submissions: new Map(),
        };

        rounds.push(round);
      }

      logger.info(`Generated ${rounds.length} rounds`);
      return rounds;
    } catch (error: any) {
      logger.error('Error generating rounds', error);
      return [];
    }
  }
}

export const multiplayerService = MultiplayerService.getInstance();
