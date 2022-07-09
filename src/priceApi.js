import { setTimeout } from 'timers/promises'

/**
 * Get a random integer between 'from' and 'to' value
 *
 * @param {number} from start boundary
 * @param {number} to end boundary
 * @returns {number} the random int
 */
const randomInt = (from, to) => Math.round(Math.random() * (to - from)) + from

let k = 0

// Stubbing an external API Call

/**
 * Get the price of a vehicule
 *
 * @returns {Promise<number>} the price
 * @throws {Error} simulating a http call error
 */
export async function getPrice() {
  // Simulate API processing time
  await setTimeout(randomInt(400, 800))

  // It will fail one out of two times
  if (++k % 2 === 0) {
    throw new Error('http call error')
  }

  // Random price
  return randomInt(10_000, 150_000)
}
