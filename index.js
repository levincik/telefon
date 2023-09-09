const { createApp , ref , reactive , computed } = Vue

function isUnderTen(value){
    return Number(value) < 10 ? '0'+value : value;
}

const app = createApp({
    setup(){

        // ------ * * GENEL BÖLÜM * * ------ //

        let tone = false;
        let page = ref('home')
        const changePage = (value) => {
            page.value = value;
            if(value == 'contact') 
                contactToHTML(contacts);
            else if(value == 'incoming'){
                tone = new Audio('sounds/ringtone.mp3');
                tone.play()
            }
            else if(value == 'message-chat')
                updateChatScroll()
            else if(value == 'calling')
                startCallTime()
        }

        let date = new Date();
        let day = date.getDate();
        let month = date.toLocaleString('default', { month: 'long' });
        let year = date.getFullYear();
        let getCurrentDate = ref(day+' '+month+' '+year);
        let getCurrentTime = ref(isUnderTen(date.getHours())+':'+isUnderTen(date.getMinutes()));

        setInterval(() => {
            let date = new Date();
            let hours = isUnderTen(date.getHours());
            let minutes = isUnderTen(date.getMinutes());
            getCurrentTime.value = hours + ':' + minutes;
        } , 1000 * 60)

        // ------ * * KEYPAD BÖLÜMÜ * * ------ //

        let keypadNumber = ref('');
        let keypadKeys = reactive([
            {name : '1'},
            {name : '2' , letters : 'A B C'},
            {name : '3' , letters : 'D E F'},
            {name : '4' , letters : 'G H I'},
            {name : '5' , letters : 'J K L'},
            {name : '6' , letters : 'M N O'},
            {name : '7' , letters : 'P Q R S'},
            {name : '8' , letters : 'T U V'},
            {name : '9' , letters : 'W X Y Z'},
            {name : '*'},
            {name : '0' , letters : '+'},
            {name : '#'},
        ]);
        const keypadPress = (key) => {
            let number = keypadNumber.value
            if(key == 'backspace'){
                return keypadNumber.value = number.substring(0, number.length - 1);
            }
            keypadNumber.value += key.name;
        }

        // ------ * * REHBER BÖLÜMÜ * * ------ //

        let contactHTML = ref('');
        let contactSearch = ref('');
        let looking = ref({})
        let newContactInfo = ref({page : 'new'});
        let contacts = reactive([]);

        const setContacts = (array) => {
            contacts = array;
            contactToHTML(array);
        }

        const contactFilter = () => {
            let filteredContacts = contacts.filter((contact) => {
                return contact.name.toLowerCase().includes(contactSearch.value.toLowerCase());
            })
            contactToHTML(filteredContacts);
        }

        const contactToHTML = async (array) => {
            await array.sort(function(a, b){return a.name.localeCompare(b.name)});

            contactHTML.value = '';
            let last_letters = '';
            await array.forEach(item => {
                let str = item.name.charAt(0).toLocaleLowerCase();
                if(last_letters != str ){
                    last_letters = str;
                    contactHTML.value = contactHTML.value+"<div class='divider' id='"+str+"'>"+(item.name.charAt(0)).toLocaleUpperCase()+"</div>";
                }

                contactHTML.value = contactHTML.value+`<div class='contact' id='`+item.number+`'>`+item.name+`</div>`;
            })

            addClickEvent();

            return array;
        }

        const addClickEvent = () => {
            let element = document.getElementsByClassName('contact')
            for(let i = 0; i < element.length; i++){
                element[i].addEventListener('click' , () => {
                    changePage('contact-person');
                    let contactIndex = contacts.find((e) => e.number == Number(element[i].id));
                    looking.value = contactIndex
                })
            }
        }

        const newContact = () => {
            let index = newContactInfo.value
            if(index.page == 'new')
                mta.triggerEvent('phone:triggerServer' , 'phone:contact:new' , index.number.toString() , index.name , index.mail)
            else if (index.page == 'edit')
                mta.triggerEvent('phone:triggerServer' , 'phone:contact:update' , looking.value.number.toString(), index.number.toString() , index.name , index.mail);
        }

        const newContactRoute = () => {
            changePage('contact-new');
            newContactInfo.value = {page : 'new'}
        }

        // ------ * * YÖNLENDİRME BÖLÜMÜ * * ------ //

        const directiveMessage = (person) => {

            if (lastMessages.value.find(e => Number(e.number) == Number(person.number))){
                return messageChat(person);
            }
            
            newMessage.value.selected = person;
            changePage('message-new')

        }

        const directiveCall = (person) => {
            startDialing(Number(person.number))
        }

        const directiveEdit = (person) => {
            changePage('contact-new');
            newContactInfo.value = person;
            newContactInfo.value.page = 'edit'
        }

        const directiveDelete = (person) => {
            setContacts(contacts.filter(e => e.number != person.number));
            changePage('contact')
            mta.triggerEvent('phone:triggerServer' , 'phone:contact:delete' , person.number.toString())
        }

        // ------ * * ARAMA BÖLÜMÜ * * ------ //

        let callName = ref('Bilinmeyen Numara')
        let callingSecond = 0;
        let callingTime = ref('00:00');
        let callInterval = false;

        const startDialing = (number) => {
            mta.triggerEvent('phone:triggerServer' , 'phone:call:dialStart' , number.toString());
            changePage('outgoing')
            let contact = contacts.find((e) => Number(e.number) == Number(number));
            callName.value = contact ? contact.name :  number
        }

        const dialAnswer = (answer) => {
            mta.triggerEvent('phone:triggerServer' , 'phone:call:dialAnswer' , answer)
            if(tone){
                tone.pause()
                tone = false
            }
        }

        const stopDialing = () => {
            mta.triggerEvent('phone:triggerServer' , 'phone:call:dialStop')
            changePage('home')
        }

        const stopCall = () => {
            mta.triggerEvent('phone:triggerServer' , 'phone:call:callStop')
        }

        const getCallingTime = (second) => {
            var sec_num = parseInt(second, 10);
            var minutes = Math.floor(sec_num / 60);
            var seconds = sec_num - (minutes * 60);

            minutes = minutes < 10 ? ("0"+minutes) : minutes
            seconds = seconds < 10 ? ("0"+seconds) : seconds
            return minutes+':'+seconds;
        }

        const startCallTime = () => {
            callInterval = setInterval(() => {
                callingSecond++;
                callingTime.value = getCallingTime(callingSecond);
            } , 1000)
        }

        const stopCallTime = () => {
            if(callInterval) clearInterval(callInterval);
            callInterval = false;
            callingSecond = 0;
            callingTime.value = '00:00'
        }

        // ------ * * MESAJ BÖLÜMÜ * * ------ //

        let chatMessages = ref([])
        let lastMessages = ref([]);
        let newMessage = ref({number : '' , selected : {} , content : ''})
        // let newMessageNumber = ref('');
        // let newMessageSelected = ref({});
        // let newMessageContent = ref('') 
        let recommendContacts = computed(() => {
            if(newMessage.value.number.length <= 0 || contacts.length <= 0)
                return []

            let matchValue = newMessage.value.number.toString().toLocaleLowerCase()
            return contacts.filter((e) => {
                if(e != newMessage.value.selected){
                    let number = e.number.toString();
                    let name = e.name.toString().toLowerCase();
                    return number.startsWith(matchValue) || name.startsWith(matchValue)
                }
            })
        })

        const getChattingName = computed(() => {
            let contact = contacts.find((e) => Number(e.number) == Number(newMessage.number))
            return contact ? contact.name : newMessage.number
        })

        const setLastMessages = (array) => {
            lastMessages.value = array;
        }

        const sendMessage = () => {
            if(!newMessage.value.selected.name && newMessage.value.number.length < 3)
                return addNotification('icons/apps/messages.png' , 'Mesajı gönderecek birini seçin!' , 'Lütfen mesajı kime göndereceğinizi belirleyeniz.')

            let who = newMessage.value.selected.name ? newMessage.value.selected.number : newMessage.value.number
            mta.triggerEvent('phone:triggerServer' , 'phone:message:send' , who.toString() , newMessage.value.content)
            newMessage.value.content = ''
        }

        const messageChat = (message) => {
            newMessage.value.content = ''
            newMessage.value.number = message.number;
            newMessage.value.name = message.name;
            mta.triggerEvent('phone:triggerServer' , 'phone:message:chat' , message.number.toString());
            changePage('message-chat');
        }

        const setChatMessages = (array) => {
            chatMessages.value = array;
            updateChatScroll();
        }

        const updateChatScroll = () => {
            setTimeout(()=> {
                let chatDiv = document.getElementById("chatMessages");
                chatDiv.scrollTop = chatDiv.scrollHeight;
            } , 50)
        }

        const updateChat = (toNumber) => {
            if(page.value == 'message-chat' && Number(toNumber) == Number(newMessage.value.number))
                return mta.triggerEvent('phone:triggerServer' , 'phone:message:chat' , toNumber.toString());
            else if(page.value == 'message-new')
                changePage('messages')
        }

        // ------ * * BİLDİRİM BÖLÜMÜ * * ------ //

        let notifications = reactive([]);

        const addNotification = (icon , title , content) => {
            if(notifications.length >= 3) notifications.shift()
            notifications.push({icon , title , content});
            if(icon.includes('message')){
                let audio = new Audio('sounds/new_message.mp3');
                audio.play();
            }
            setTimeout(() => {notifications.shift()} , 4000)
        }

        return {
            page,
            changePage,

            getCurrentTime,
            getCurrentDate,

            keypadNumber,
            keypadKeys,
            keypadPress,

            callName,
            startDialing,
            stopDialing,
            dialAnswer,
            stopCall,
            stopCallTime,
            startCallTime,
            callingTime,

            setContacts,
            contactHTML,
            contactSearch,
            contacts,
            contactFilter,
            looking,
            newContact,
            newContactInfo,
            newContactRoute,

            newMessage,
            recommendContacts,
            lastMessages,
            setLastMessages,
            sendMessage,
            messageChat,
            chatMessages,
            setChatMessages,
            updateChat,
            updateChatScroll,
            getChattingName,

            directiveMessage,
            directiveCall,
            directiveEdit,
            directiveDelete,

            notifications,
            addNotification,
        }
    }
}).mount('#app');