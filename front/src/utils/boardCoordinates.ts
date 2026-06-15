/**
 * @file src/utils/boardCoordinates.ts
 * @description Translates backend relative piece positions (-1 to 44) 
 * into physical grid coordinates (row, col) on an 11x11 board layout.
 */

// Interface defining the row and column structure on our 11x11 board.
export interface GridCoordinate {
  row: number; // Row index from 0 (top) to 10 (bottom)
  col: number; // Column index from 0 (left) to 10 (right)
}

/**
 * Ordered list of the 40 shared circular track spaces on the 11x11 grid.
 * Index 0 represents the starting point of Player 0 (Red) at (4, 0).
 * The track flows clockwise around the cross-shaped board.
 */
export const CIRCULAR_TRACK_COORDINATES: GridCoordinate[] = [
  { row: 4, col: 0 },  // 0  (Player 0 Red Start)
  { row: 4, col: 1 },  // 1
  { row: 4, col: 2 },  // 2
  { row: 4, col: 3 },  // 3
  { row: 4, col: 4 },  // 4
  { row: 3, col: 4 },  // 5
  { row: 2, col: 4 },  // 6
  { row: 1, col: 4 },  // 7
  { row: 0, col: 4 },  // 8
  { row: 0, col: 5 },  // 9  (Top turn)
  { row: 0, col: 6 },  // 10 (Player 1 Blue Start)
  { row: 1, col: 6 },  // 11
  { row: 2, col: 6 },  // 12
  { row: 3, col: 6 },  // 13
  { row: 4, col: 6 },  // 14
  { row: 4, col: 7 },  // 15
  { row: 4, col: 8 },  // 16
  { row: 4, col: 9 },  // 17
  { row: 4, col: 10 }, // 18
  { row: 5, col: 10 }, // 19 (Right turn)
  { row: 6, col: 10 }, // 20 (Player 2 Green Start)
  { row: 6, col: 9 },  // 21
  { row: 6, col: 8 },  // 22
  { row: 6, col: 7 },  // 23
  { row: 6, col: 6 },  // 24
  { row: 7, col: 6 },  // 25
  { row: 8, col: 6 },  // 26
  { row: 9, col: 6 },  // 27
  { row: 10, col: 6 }, // 28
  { row: 10, col: 5 }, // 29 (Bottom turn)
  { row: 10, col: 4 }, // 30 (Player 3 Yellow Start)
  { row: 9, col: 4 },  // 31
  { row: 8, col: 4 },  // 32
  { row: 7, col: 4 },  // 33
  { row: 6, col: 4 },  // 34
  { row: 6, col: 3 },  // 35
  { row: 6, col: 2 },  // 36
  { row: 6, col: 1 },  // 37
  { row: 6, col: 0 },  // 38
  { row: 5, col: 0 },  // 39 (Left turn)
];

/**
 * Yard (Base) coordinate mapping for all 4 players.
 * Represents where pieces sit when they are in the starting area (-1 state).
 * Each yard has 4 slots to hold 4 distinct pieces without overlap.
 */
export const YARD_COORDINATES: Record<number, GridCoordinate[]> = {
  // Visual Player 0 (Red) - Top Left
  0: [
    { row: 1, col: 1 }, { row: 1, col: 2 },
    { row: 2, col: 1 }, { row: 2, col: 2 }
  ],
  // Visual Player 1 (Blue) - Top Right
  1: [
    { row: 1, col: 8 }, { row: 1, col: 9 },
    { row: 2, col: 8 }, { row: 2, col: 9 }
  ],
  // Visual Player 2 (Green) - Bottom Right
  2: [
    { row: 8, col: 8 }, { row: 8, col: 9 },
    { row: 9, col: 8 }, { row: 9, col: 9 }
  ],
  // Visual Player 3 (Yellow) - Bottom Left
  3: [
    { row: 8, col: 1 }, { row: 8, col: 2 },
    { row: 9, col: 1 }, { row: 9, col: 2 }
  ]
};

/**
 * Home path private columns for all 4 players (positions 40 to 43).
 * Each maps relative indexes 40, 41, 42, 43 to grid spaces.
 */
export const HOME_COLUMN_COORDINATES: Record<number, Record<number, GridCoordinate>> = {
  // Visual Player 0 (Red): Horizontal path heading right
  0: {
    40: { row: 5, col: 1 }, 41: { row: 5, col: 2 }, 42: { row: 5, col: 3 }, 43: { row: 5, col: 4 }
  },
  // Visual Player 1 (Blue): Vertical path heading down
  1: {
    40: { row: 1, col: 5 }, 41: { row: 2, col: 5 }, 42: { row: 3, col: 5 }, 43: { row: 4, col: 5 }
  },
  // Visual Player 2 (Green): Horizontal path heading left
  2: {
    40: { row: 5, col: 9 }, 41: { row: 5, col: 8 }, 42: { row: 5, col: 7 }, 43: { row: 5, col: 6 }
  },
  // Visual Player 3 (Yellow): Vertical path heading up
  3: {
    40: { row: 9, col: 5 }, 41: { row: 8, col: 5 }, 42: { row: 7, col: 5 }, 43: { row: 6, col: 5 }
  }
};

// Center goal tile (position 44) where all players finish.
export const CENTER_GOAL_COORDINATE: GridCoordinate = { row: 5, col: 5 };

/**
 * Map client player index to a visually logical position.
 * For a 2-player game, we place them opposite of each other (Red & Green) for balanced look.
 *
 * @param clientIndex Index of the player in the backend 'players' array (0 or 1 for 2P, 0-3 for 4P)
 * @param playerCount Maximum capacity of the match (2 or 4)
 * @returns Visual layout index (0 to 3) representing Red, Blue, Green, Yellow
 */
export function getVisualPlayerIndex(clientIndex: number, playerCount: number): number {
  if (playerCount === 2) {
    // Player 0 stays Red (0), Player 1 becomes Green (2)
    return clientIndex === 0 ? 0 : 2;
  }
  // In 4-player games, visual and client indexes are perfectly aligned
  return clientIndex;
}

/**
 * Gets the starting offset for a player based on their visual index and player count.
 * Matches starting absolute offset specs defined in ARCHITECTURE.md.
 */
export function getStartingOffset(visualIndex: number): number {
  switch (visualIndex) {
    case 0: return 0;   // Player 0 (Red) starts at absolute 0
    case 1: return 10;  // Player 1 (Blue) starts at absolute 10
    case 2: return 20;  // Player 2 (Green) starts at absolute 20
    case 3: return 30;  // Player 3 (Yellow) starts at absolute 30
    default: return 0;
  }
}

/**
 * Main utility function to translate a relative position into (row, col) coordinates.
 *
 * @param clientIndex The index of the player in the backend players list (0 to playerCount - 1)
 * @param pieceIndex Index of the specific piece (0 to pieces_count - 1)
 * @param relativePosition Relative position on the board (-1 to 44)
 * @param playerCount Total players in the game (2 or 4)
 * @returns Precise GridCoordinate for placing the piece on the grid
 */
export function getPieceCoordinates(
  clientIndex: number,
  pieceIndex: number,
  relativePosition: number,
  playerCount: number
): GridCoordinate {
  const visualIndex = getVisualPlayerIndex(clientIndex, playerCount);
  
  // Safe parsing cast to guarantee numeric comparison works seamlessly
  const numericPos = Number(relativePosition);

  // Case 1: Piece is in the Yard/Base (-1)
  if (numericPos === -1) {
    const slots = YARD_COORDINATES[visualIndex];
    return slots[pieceIndex % slots.length];
  }

  // Case 2: Piece is in the final center goal (44)
  if (numericPos === 44) {
    return CENTER_GOAL_COORDINATE;
  }

  // Case 3: Piece is in the private home column (40 to 43)
  if (numericPos >= 40 && numericPos <= 43) {
    return HOME_COLUMN_COORDINATES[visualIndex][numericPos];
  }

  // Case 4: Piece is on the main shared circular track (0 to 39)
  if (numericPos >= 0 && numericPos <= 39) {
    const offset = getStartingOffset(visualIndex);
    const absoluteIndex = (numericPos + offset) % 40;
    return CIRCULAR_TRACK_COORDINATES[absoluteIndex];
  }

  // Fallback default in case of unexpected state
  return CENTER_GOAL_COORDINATE;
}