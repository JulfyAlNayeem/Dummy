import React from 'react'

export default function Account() {
  return (
    <div className=' bg-sky-100 w-full  p-3'>
      <div className="h-screen flex-grow overflow-y-auto ">
        <header className="bg-white border-b p-3 rounded-md">
          <h1 className="text-2xl font-bold">Account Settings</h1>
        </header>
        <main className="py-6">
          <div className="">
            <div className="max-w-4xl ">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <img src="" alt="Profile" className="w-16 h-16 rounded-full" />
                  <div className="ml-4">
                    <h4 className="text-xl font-semibold">Julianne Moore</h4>
                    <a href="#" className="text-sm text-gray-600">View Profile</a>
                  </div>
                  <button className="ml-auto btn btn-neutral">Upload</button>
                </div>
                <h5 className="mb-4 font-bold">Contact Information</h5>
                <form>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="first_name">First name</label>
                      <input type="text" className="form-input mt-1 block w-full" id="first_name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="last_name">Last name</label>
                      <input type="text" className="form-input mt-1 block w-full" id="last_name" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="email">Email</label>
                      <input type="email" className="form-input mt-1 block w-full" id="email" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="phone_number">Phone number</label>
                      <input type="tel" className="form-input mt-1 block w-full" id="phone_number" />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700" htmlFor="address">Address</label>
                    <input type="text" className="form-input mt-1 block w-full" id="address" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="city">City</label>
                      <input type="text" className="form-input mt-1 block w-full" id="city" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="country">Country</label>
                      <select className="form-select mt-1 block w-full" id="country">
                        <option>Country</option>
                        <option value="1">One</option>
                        <option value="2">Two</option>
                        <option value="3">Three</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700" htmlFor="zip">ZIP</label>
                      <input type="text" className="form-input mt-1 block w-full" id="zip" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button className="btn btn-primary">Save</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
