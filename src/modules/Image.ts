import { ExifImage } from 'exif';

try {
  new ExifImage({ image: 'IMG_20190816_125356.jpg' }, (error, exifData) => {
    if (error)
      console.log('Error: ' + error.message);
    else
      console.log(exifData); // Do something with your data!
  });
} catch (error) {
  console.log('Error: ' + error.message);
}
