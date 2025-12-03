import { requireTeacher } from "../../../../middlewares/roleMiddleware.js"
import { createClass } from "../../../../controllers/classController.js"

export async function POST(request) {
  try {
    // Create mock req/res objects for middleware compatibility
    const req = {
      body: await request.json(),
      headers: Object.fromEntries(request.headers.entries()),
      cookies: request.cookies,
    }

    const res = {
      status: (code) => ({
        json: (data) => Response.json(data, { status: code }),
      }),
      json: (data) => Response.json(data),
    }

    // Apply middleware
    await new Promise((resolve, reject) => {
      requireTeacher(req, res, (error) => {
        if (error) reject(error)
        else resolve()
      })
    })

    return await createClass(req, res)
  } catch (error) {
    return Response.json({ message: "Server error", error: error.message }, { status: 500 })
  }
}
