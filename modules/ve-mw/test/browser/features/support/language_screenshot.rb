def capture_screenshot(file_name, page_elements)
  screenshot_directory = ENV["LANGUAGE_SCREENSHOT_PATH"] || "screenshots"
  FileUtils.mkdir_p screenshot_directory
  screenshot_path = "#{screenshot_directory}/#{file_name}"
  @browser.send_keys [:control, :add]
  @browser.screenshot.save screenshot_path
  crop_image screenshot_path, page_elements
end

def crop_image path, page_elements
  crop_rectangle = rectangle(coordinates_from_page_elements(page_elements))
  top_left_x = crop_rectangle[0]
  top_left_y = crop_rectangle[1]
  width = crop_rectangle[2]
  height = crop_rectangle[3]

  require "chunky_png"
  element = ChunkyPNG::Image.from_file path
  element.crop!(top_left_x, top_left_y, width, height)
  element.save path
end

def rectangle rectangles

  top_left_x, top_left_y = top_left_x_y rectangles

  bottom_right_x , bottom_right_y = bottom_right_x_y rectangles
  # Finding width and height
  width = bottom_right_x - top_left_x
  height = bottom_right_y - top_left_y

  # The new rectangle is constructed with all the co-ordinates calculated above
  [top_left_x, top_left_y, width, height]
end

def coordinates_from_page_elements page_elements
  page_elements.collect do |page_element|
    coordinates_from_page_element page_element
  end
end

def coordinates_from_page_element page_element
  [page_element.element.wd.location.x, page_element.element.wd.location.y, page_element.element.wd.size.width, page_element.element.wd.size.height]
end

def top_left_x_coordinates input_rectangles
  input_rectangles.collect do |rectangle|
    rectangle[0]
  end
end

def top_left_y_coordinates input_rectangles
  input_rectangles.collect do |rectangle|
    rectangle[1]
  end
end

def bottom_right_x_coordinates input_rectangles
  input_rectangles.collect do |rectangle|
    rectangle[0]+rectangle[2]
  end
end

def bottom_right_y_coordinates input_rectangles
  input_rectangles.collect do |rectangle|
    rectangle[1]+rectangle[3]
  end
end

def bottom_right_x_y input_rectangles
  [bottom_right_x_coordinates(input_rectangles).max, bottom_right_y_coordinates(input_rectangles).max]
end

def top_left_x_y input_rectangles
  [top_left_x_coordinates(input_rectangles).min, top_left_y_coordinates(input_rectangles).min]
end


