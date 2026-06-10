import { registerPlugin } from '@capacitor/core'
import type { FavGroup } from './useFavorites'

export interface RadioFavoritesPlugin {
  setFavorites(options: { groups: FavGroup[] }): Promise<void>
}

export const RadioFavorites = registerPlugin<RadioFavoritesPlugin>('RadioFavorites', {
  web: {
    setFavorites: async () => {},
  },
})
