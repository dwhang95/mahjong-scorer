export function createManualTileInput(getSelectedTileIds) {
  return {
    source: "manual",
    parseTiles() {
      return [...getSelectedTileIds()];
    },
  };
}

export function createPhotoTileInput() {
  return {
    source: "photo",
    async parseTiles() {
      throw new Error("Photo recognition is not implemented yet.");
    },
  };
}
