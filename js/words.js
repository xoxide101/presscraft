/* PressCraft words: ready wording for each kind of project (all written for PressCraft), and the QR code that suits it.
   window.PressWords.for(kind) → [[group, [words…]]…]   window.PressWords.qr[kind] → what a QR code on it is usually for */
(function () {
  'use strict';
  const CARD = [
    ['Birthday', ['Happy Birthday!', 'Wishing you a year full of good days and great surprises.', 'Another trip around the sun: may this one be the best yet!', 'Hope your day is as wonderful as you are.', 'Cake first, candles second, and a whole lot of fun in between.', 'Here’s to you, today and every day.']],
    ['Thank you', ['Thank You!', 'Thank you for your kindness. It meant more than you know.', 'With heartfelt thanks', 'Thanks a million!', 'Your help made all the difference. Thank you.']],
    ['Get well', ['Get Well Soon!', 'Sending warm wishes for a speedy recovery.', 'Rest up, feel better, and come back soon.', 'Thinking of you and wishing you better days ahead.']],
    ['Sympathy', ['With Deepest Sympathy', 'Thinking of you in this difficult time.', 'Holding you close in our thoughts.', 'May loving memories bring you comfort and peace.']],
    ['Wedding', ['Congratulations on Your Wedding!', 'Wishing you a lifetime of love and laughter.', 'Two hearts, one adventure. Congratulations!', 'Best wishes on your wedding day and always.']],
    ['Anniversary', ['Happy Anniversary!', 'Here’s to many more years together.', 'Celebrating your love today and every day.']],
    ['New baby', ['Welcome, Little One!', 'Congratulations on your new arrival!', 'A tiny new heart to love. Congratulations!', 'Sweet dreams and happy days to your new family.']],
    ['Graduation', ['Congratulations, Graduate!', 'The tassel was worth the hassle!', 'So proud of everything you have achieved.', 'Your future is bright. Go get it!']],
    ['Congratulations', ['Congratulations!', 'Well done! You earned it.', 'Cheers to your success!', 'Hard work pays off. Congratulations!']],
    ['Holidays', ['Season’s Greetings', 'Happy Holidays!', 'Merry Christmas and a Happy New Year', 'Peace, joy and love this holiday season.', 'Happy New Year!', 'Happy Thanksgiving: grateful for you.', 'Happy Easter!', 'Happy Halloween!', 'Happy Hanukkah!', 'Happy Mother’s Day', 'Happy Father’s Day', 'Happy Valentine’s Day']],
    ['Love and friendship', ['Thinking of You', 'You make every day brighter.', 'Just because: you’re the best.', 'Friends like you are hard to find.', 'With love,']],
    ['Signing off', ['With love,', 'Warm wishes,', 'Best wishes,', 'Fondly,', 'Love always,', 'Cheers,']],
  ];
  const SIGN = [
    ['Shop and office', ['OPEN', 'CLOSED', 'Back in 15 Minutes', 'Please Ring the Bell', 'Please Use Other Door', 'Staff Only', 'No Food or Drinks', 'Thank You for Shopping With Us!', 'Cash Only', 'We Accept Cards', 'Free Wi-Fi: Scan the Code']],
    ['Sale', ['SALE', 'Yard Sale Today!', 'Garage Sale: Saturday 8 am to 2 pm', 'Everything Must Go!', 'Half Price', 'Buy One, Get One Free', 'Clearance', 'For Sale']],
    ['Safety', ['Caution: Wet Floor', 'Watch Your Step', 'Do Not Enter', 'Authorized Personnel Only', 'Emergency Exit', 'Keep Door Closed', 'No Parking', 'Slow: Children at Play']],
    ['Directions', ['This Way →', '← This Way', 'Party Here!', 'Restrooms', 'Entrance', 'Exit', 'Parking', 'Registration']],
    ['Home and party', ['Welcome!', 'Happy Birthday!', 'Welcome Home!', 'Quiet Please: Baby Sleeping', 'Please Remove Your Shoes', 'Gifts', 'Food and Drinks', 'Guest Book']],
  ];
  const FLYER = [
    ['Headlines', ['You’re Invited!', 'Grand Opening!', 'Lost Pet: Please Help', 'Found Pet', 'Lessons Available', 'Now Hiring', 'Bake Sale', 'Car Wash Fundraiser', 'Community Meeting', 'Free Estimates', 'Room for Rent', 'Concert in the Park', 'Join Our Team!', 'Save the Date']],
    ['Details', ['When:', 'Where:', 'Time:', 'Cost: Free', 'Everyone welcome!', 'Bring a friend!', 'Refreshments served', 'Call or text:', 'Reward offered', 'Limited spaces: sign up early']],
    ['Calls to action', ['Call today!', 'Scan the code to sign up', 'Visit our website', 'Don’t miss out!', 'Tear off a tab below', 'RSVP by']],
  ];
  const BANNER = [['Messages', ['WELCOME HOME!', 'HAPPY BIRTHDAY!', 'CONGRATULATIONS!', 'GRAND OPENING', 'HAPPY RETIREMENT!', 'GO TEAM GO!', 'WELCOME BABY', 'HAPPY ANNIVERSARY', 'BON VOYAGE!', 'CONGRATS GRAD!', 'HAPPY HOLIDAYS', 'HAPPY NEW YEAR!', 'THANK YOU!', 'WE MISSED YOU!', 'JUST MARRIED']]];
  const POSTCARD = [
    ['Greetings', ['Greetings from', 'Wish you were here!', 'Having a wonderful time!', 'Hello from', 'Thinking of you from far away.']],
    ['News', ['We’ve moved! Our new address is', 'Save the date!', 'You’re invited!', 'Just a note to say hello.', 'Thanks for visiting!']],
  ];
  const CERT = [
    ['Titles', ['Certificate of Achievement', 'Certificate of Appreciation', 'Certificate of Completion', 'Award of Excellence', 'Employee of the Month', 'Volunteer of the Year', 'Honor Roll', 'Perfect Attendance', 'Certificate of Participation', 'Gift Certificate']],
    ['Wording', ['This certificate is proudly presented to', 'In recognition of outstanding achievement', 'For dedication and hard work', 'In grateful appreciation of your service', 'For successfully completing', 'Presented this day of', 'Signature', 'Date']],
  ];
  const BUSINESS = [
    ['Taglines', ['Quality you can count on', 'Friendly service since', 'Your neighborhood experts', 'Licensed and insured', 'Free estimates', 'Satisfaction guaranteed', 'Family owned and operated']],
    ['Letters', ['Dear', 'To whom it may concern,', 'Thank you for your business.', 'Sincerely,', 'Kind regards,', 'Best regards,', 'Enclosure', 'Please find attached']],
    ['Contact lines', ['Phone:', 'Email:', 'Website:', 'Address:', 'Hours: Mon to Fri, 9 am to 5 pm']],
  ];
  const NEWS = [
    ['Section headings', ['From the Editor', 'News in Brief', 'Upcoming Events', 'Member Spotlight', 'Tips and Tricks', 'Recipe of the Month', 'Did You Know?', 'Thank You to Our Volunteers', 'Calendar', 'Contact Us', 'Around the Neighborhood', 'Kids’ Corner']],
    ['Mastheads', ['The Neighborhood News', 'Family Times', 'The Monthly Update', 'Club Chronicle', 'School Bulletin']],
  ];
  const LABELS = [
    ['On the box', ['FRAGILE', 'Handle With Care', 'This Side Up ↑', 'Keep Dry', 'Do Not Bend', 'Perishable', 'Priority', 'Return Service Requested']],
    ['Addresses', ['From:', 'To:', 'Return to:', 'Ship to:']],
    ['Jars and gifts', ['Homemade with love', 'Made by', 'Best before', 'Ingredients:', 'Strawberry Jam', 'Happy Holidays from our kitchen', 'Open me first!']],
  ];
  const CD = [['Labels', ['Mix Tape', 'Road Trip Songs', 'Family Photos', 'Backup', 'Wedding Video', 'Party Playlist', 'Track list', 'Volume 1', 'Do Not Erase']]];
  const CAL = [['Notes for a day', ['Birthday!', 'Holiday', 'Vacation', 'Payday', 'Doctor', 'School starts', 'Trash day', 'Game night', 'Family dinner', 'Anniversary']]];
  const FORMS = [['Fields', ['Name:', 'Date:', 'Signature:', 'Phone:', 'Email:', 'Address:', 'Amount:', 'Notes:', 'Approved by:', 'Thank you for your business!']]];
  const BY = { card: CARD, postcard: POSTCARD, labels: LABELS, cd: CD, flyer: FLYER, sign: SIGN, brochure: [...FLYER, ...BUSINESS.slice(0, 1)], banner: BANNER, newsletter: NEWS, stationery: BUSINESS, letterhead: BUSINESS, businesscard: BUSINESS, forms: FORMS, certificate: CERT, calendar: CAL };
  // a QR code on each kind of project: what it is usually for (the barcode window starts there; any other can be chosen)
  const QR = { card: 'url', postcard: 'url', labels: 'vcard', cd: 'url', flyer: 'event', sign: 'wifi', brochure: 'url', banner: 'url', newsletter: 'url', stationery: 'vcard', letterhead: 'vcard', businesscard: 'vcard', forms: 'url', certificate: 'url', calendar: 'event' };
  const ALL = [['Cards', CARD], ['Signs', SIGN], ['Flyers', FLYER], ['Banners', BANNER], ['Postcards', POSTCARD], ['Certificates', CERT], ['Business', BUSINESS], ['Newsletters', NEWS], ['Labels', LABELS]];
  window.PressWords = { for: (kind) => BY[kind] || CARD, all: ALL, qr: QR };
})();
