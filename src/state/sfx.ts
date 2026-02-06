import { Audio } from "expo-av";

const BEEP_URI =
  "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAq9Dt/P3v066DWDIUBAIOKU14o8rp+/7y2baLYDgZBgELI0Zwm8Tk+P72372TaD8eCAEIHj9ok73f9v745MSbcEYjCwEGGThgi7bZ8v776cqjeE0pDgIEFDJYg67T7/387dCrf1QvEgMCECxRfKfN6/v98dayh1w1FgQBDSZJdJ/H5vn+9Ny5j2Q7GwcBCSBCbJfA4ff/9+HAl2xCIAkBBxs7ZI+53PT++ebHn3RJJg0BBBY1XIey1vH9++vNp3xRLBACAxIvVICr0O38/e/TroNYMhQEAg4pTXijyun7/vLZtotgOBkGAQsjRnCbxOT4/vbfvZNoPx4IAQgeP2iTvd/2/vjkxJtwRiMLAQYZOGCLttny/vvpyqN4TSkOAgQUMliDrtPv/fzt0KuAVC8SAwIQLFF8p83r+/3x1rKHXDUWBAENJkl0n8fm+f703LmPZDsbBwEJIEJsl8Dh9//34cCXbEIgCQEHGztkj7nc9P755sefdEkmDQEEFjVch7LW8f37682nfFEsEAIDEi9UgKvQ7fz979Oug1gyFAQCDilNeKPK6fv+8tm2i2A4GQYBCyNGcJvE5Pj+9t+9k2g/HggBCB4/aJO93/b++OTEm3BGIwsBBhk4YIu22fL+++nKo3hNKQ4CBBQyWIOu0+/9/O3Qq39ULxIDAhAsUXynzev7/fHWsodcNRYEAQ0mSXSfx+b5/vTcuY9kOxsHAQkgQmyXwOH3//fhwJdsQiAJAQcbO2SPudz0/vnmx590SSYNAQQWNVyHstbx/fvrzad8USwQAgMSL1R/q9Dt/P3v066DWDIUBAIOKU14o8rp+/7y2baLYDgZBgELI0Zwm8Tk+P72372TaD8eCAEIHj9ok73f9v745MSbcEYjCwEGGThgi7bZ8v776cqjeE0pDgIEFDJYg67T7/387dCrf1QvEgMCECxRfKfN6/v98dayh1w1FgQBDSZJdJ/H5vn+9Ny5j2Q7GwcBCSBCbJfA4ff/9+HAl2xCIAkBBxs7ZI+53PT++ebHn3RJJg0BBBY1XIey1vH9++vNp3xRLBACAxIvVA==";

const soundCache = new Map<string, Audio.Sound>();

export const playSfx = async (id: "smash" | "poison", enabled: boolean) => {
  if (!enabled) {
    return;
  }
  try {
    let sound = soundCache.get(id);
    if (!sound) {
      const created = await Audio.Sound.createAsync(
        { uri: BEEP_URI },
        { shouldPlay: true, volume: 0.4 }
      );
      sound = created.sound;
      soundCache.set(id, sound);
    } else {
      await sound.replayAsync();
    }
  } catch (error) {
    // Ignore sound failures to avoid crashing the UI.
  }
};
