/** Props every saved game receives. `initialSave` is untrusted: validate its shape before using it. */
export type SavedGameProps = {
  initialSave: unknown;
  /** Call whenever something worth keeping changes. Saving is debounced for you. */
  onSave: (data: unknown) => void;
  signedIn: boolean;
};
