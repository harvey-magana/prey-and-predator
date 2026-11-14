# Prey and Predator — Glass Edition

A five-round, mouse-controlled 8×8 turn-based browser chase game. The mole moves one square in any direction (including diagonals); the fox pursues it by moving **up to two squares** horizontally or vertically, choosing the dominant axis. Reach the black hole to escape. The rules and initial spawn-distance constraint are inherited from the original version.

## Run in Docker

Install and start Docker Desktop, then from the repository directory:

```bash
docker compose up --build -d
```

Open **http://localhost:8080** in Chrome. To stop:

```bash
docker compose down
```

Or use the classic Docker commands:

```bash
docker build -t prey-and-predator:glass .
docker run --rm -p 127.0.0.1:8080:8080 prey-and-predator:glass
```

The container serves static HTML/CSS/JS with Nginx on port 8080. No Node.js runtime or Internet access is needed during gameplay. Docker needs Internet access initially to pull the unprivileged Nginx base image.

## Controls & visuals

- Click an adjacent tile; diagonal moves are allowed for the mole.
- Click **Sound off** to activate the procedural rough-brick scraping effect. Chrome requires an explicit interaction before enabling sound.
- Both tokens have frosted, shimmering glass lenses and rock as they move horizontally.
- Animations use JavaScript's `requestAnimationFrame` and respect `prefers-reduced-motion`.
- Click **Restart** to begin a new five-round match; stale timers/animations are cancelled.

## Run without Docker

Open `index.html` directly in Chrome. 

## Notes

The generated rasp is an approximation of dry bricks scraping against grout, synthesized with Web Audio. It is not a sampled recording. The fox uses a platform emoji; the mole uses a small original vector illustration drawn directly on the canvas.
