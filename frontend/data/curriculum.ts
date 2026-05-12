export const curriculumData: Record<string, any[]> = {
  'Tiếng Anh': [
    { id: '1', title: 'Cơ bản 1', short: 'Cơ bản 1', icon: 'egg', coords_x: 2, coords_y: 1, completed: true, current: false, locked: false, words: ['I', 'you', 'is', 'am', 'a', 'boy', 'girl', 'apple', 'water', 'bread'] },
    { id: '2', title: 'Cơ bản 2', short: 'Cơ bản 2', icon: 'star', coords_x: 1, coords_y: 2, completed: true, current: false, locked: false, words: ['he', 'she', 'it', 'we', 'they', 'dog', 'cat', 'milk', 'rice', 'eat'] },
    { id: '3', title: 'Chào hỏi', short: 'Chào hỏi', icon: 'hand-left', coords_x: 3, coords_y: 2, completed: false, current: true, locked: false, words: ['hello', 'good morning', 'goodbye', 'thanks', 'please', 'sorry', 'yes', 'no', 'how', 'are'] },
    { id: '4', title: 'Gia đình', short: 'Gia đình', icon: 'people', coords_x: 2, coords_y: 3, completed: false, current: false, locked: true, words: ['mother', 'father', 'sister', 'brother', 'son', 'daughter', 'grandfather', 'grandmother', 'uncle', 'aunt'] },
    { id: '5', title: 'Mua sắm', short: 'Mua sắm', icon: 'cart', coords_x: 1, coords_y: 4, completed: false, current: false, locked: true, words: ['buy', 'price', 'expensive', 'cheap', 'money', 'pay', 'store', 'clothes', 'shoes', 'shirt'] },
    { id: '6', title: 'Nhà hàng', short: 'Nhà hàng', icon: 'restaurant', coords_x: 3, coords_y: 4, completed: false, current: false, locked: true, words: ['menu', 'food', 'water', 'delicious', 'table', 'waiter', 'bill', 'chicken', 'beef', 'fish'] },
    { id: '7', title: 'Sở thích', short: 'Sở thích', icon: 'bicycle', coords_x: 2, coords_y: 5, completed: false, current: false, locked: true, words: ['play', 'game', 'read', 'book', 'music', 'listen', 'watch', 'movie', 'sports', 'run'] },
    { id: '8', title: 'Thời gian', short: 'Thời gian', icon: 'time', coords_x: 2, coords_y: 6, completed: false, current: false, locked: true, words: ['time', 'hour', 'minute', 'today', 'tomorrow', 'yesterday', 'now', 'morning', 'night', 'day'] },
  ],
  'Tiếng Việt': [
    { id: '1', title: 'Bảng chữ cái', short: 'Bảng chữ cái', icon: 'egg', coords_x: 2, coords_y: 1, completed: true, current: false, locked: false, words: ['a', 'b', 'c', 'd', 'e', 'g', 'h', 'i', 'k', 'l'] },
    { id: '2', title: 'Dấu câu', short: 'Dấu câu', icon: 'text', coords_x: 2, coords_y: 2, completed: false, current: true, locked: false, words: ['sắc', 'huyền', 'hỏi', 'ngã', 'nặng'] },
    { id: '3', title: 'Chào hỏi', short: 'Chào hỏi', icon: 'hand-left', coords_x: 2, coords_y: 3, completed: false, current: false, locked: true, words: ['xin chào', 'tạm biệt', 'cảm ơn', 'xin lỗi', 'vâng', 'không', 'bạn', 'tôi', 'khỏe', 'tên'] },
    { id: '4', title: 'Số đếm', short: 'Số đếm', icon: 'calculator', coords_x: 1, coords_y: 4, completed: false, current: false, locked: true, words: ['một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'] },
  ],
  'Tiếng Tây Ban Nha': [
    { id: '1', title: 'Cơ bản 1', short: 'Cơ bản 1', icon: 'egg', coords_x: 2, coords_y: 1, completed: true, current: false, locked: false, words: ['yo', 'tú', 'soy', 'un', 'niño', 'niña', 'el', 'la', 'hombre', 'mujer'] },
    { id: '2', title: 'Flirting', short: 'Flirting', icon: 'heart', coords_x: 1, coords_y: 2, completed: false, current: true, locked: false, words: ['quieres', 'eres', 'cielo', 'ojos', 'hola', 'bonita', 'guapo', 'amor', 'beso', 'corazón'] },
    { id: '3', title: 'Thành ngữ', short: 'Thành ngữ', icon: 'chatbubbles', coords_x: 3, coords_y: 2, completed: false, current: false, locked: true, words: ['quien', 'con', 'más', 'todo', 'mal', 'bien', 'agua', 'pan', 'leche', 'gato'] },
    { id: '4', title: 'Gia đình', short: 'Gia đình', icon: 'people', coords_x: 2, coords_y: 3, completed: false, current: false, locked: true, words: ['padre', 'madre', 'hermano', 'hermana', 'abuelo', 'abuela', 'hijo', 'hija', 'tío', 'tía'] },
  ],
  'Tiếng Trung': [
    { id: '1', title: 'Pinyin', short: 'Pinyin', icon: 'mic', coords_x: 2, coords_y: 1, completed: true, current: false, locked: false, words: ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k'] },
    { id: '2', title: 'Chào hỏi', short: 'Chào hỏi', icon: 'hand-left', coords_x: 1, coords_y: 2, completed: false, current: true, locked: false, words: ['nǐ hǎo', 'zàijiàn', 'xièxiè', 'duìbùqǐ', 'míngzi', 'wǒ', 'nǐ', 'tā', 'hǎo', 'míngbai'] },
    { id: '3', title: 'Số đếm', short: 'Số đếm', icon: 'calculator', coords_x: 3, coords_y: 2, completed: false, current: false, locked: true, words: ['yī', 'èr', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ', 'shí'] },
    { id: '4', title: 'Ăn uống', short: 'Ăn uống', icon: 'restaurant', coords_x: 2, coords_y: 3, completed: false, current: false, locked: true, words: ['chī', 'hē', 'shuǐ', 'chá', 'mǐfàn', 'miàntiáo', 'ròu', 'yú', 'hǎochī', 'è'] },
  ],
  'Tiếng Nhật': [
    { id: '1', title: 'Hiragana 1', short: 'Hiragana 1', icon: 'language', coords_x: 2, coords_y: 1, completed: true, current: false, locked: false, words: ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'] },
    { id: '2', title: 'Hiragana 2', short: 'Hiragana 2', icon: 'language', coords_x: 2, coords_y: 2, completed: false, current: true, locked: false, words: ['さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と'] },
    { id: '3', title: 'Chào hỏi', short: 'Chào hỏi', icon: 'hand-left', coords_x: 1, coords_y: 3, completed: false, current: false, locked: true, words: ['konnichiwa', 'arigatou', 'sumimasen', 'ohayou', 'sayounara', 'hai', 'iie', 'watashi', 'anata', 'namae'] },
    { id: '4', title: 'Gia đình', short: 'Gia đình', icon: 'people', coords_x: 3, coords_y: 3, completed: false, current: false, locked: true, words: ['chichi', 'haha', 'ani', 'ane', 'otouto', 'imouto', 'kazoku', 'sofu', 'sobo', 'kodomo'] },
  ],
  'Tiếng Hàn': [
    { id: '1', title: 'Hangul 1', short: 'Hangul 1', icon: 'language', coords_x: 2, coords_y: 1, completed: true, current: false, locked: false, words: ['아', '야', '어', '여', '오', '요', '우', '유', '으', '이'] },
    { id: '2', title: 'Hangul 2', short: 'Hangul 2', icon: 'language', coords_x: 2, coords_y: 2, completed: false, current: true, locked: false, words: ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차'] },
    { id: '3', title: 'Chào hỏi', short: 'Chào hỏi', icon: 'hand-left', coords_x: 1, coords_y: 3, completed: false, current: false, locked: true, words: ['annyeonghaseyo', 'gamsahamnida', 'joesonghamnida', 'ne', 'aniyo', 'jeo', 'dangsin', 'ireum', 'annyeonghigaseyo', 'mannaseo bangawoyo'] },
    { id: '4', title: 'Đồ ăn', short: 'Đồ ăn', icon: 'restaurant', coords_x: 3, coords_y: 3, completed: false, current: false, locked: true, words: ['bap', 'mul', 'kimchi', 'bulgogi', 'bibimbap', 'ramyeon', 'masisseoyo', 'baegopayo', 'meokda', 'masida'] },
  ]
};
