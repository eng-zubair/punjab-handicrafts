import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default {
  from: 'client/src/index.css',
  plugins: [
    tailwindcss(),
    autoprefixer(),
  ],
}
