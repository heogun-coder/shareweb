#Share Web MVP
{domain.com}/register : Google OAuth를 지원하도록 설계 or 단순 ID+PW 조합. 이후 ECC 기반의 공개키, 개인키 쌍 클라이언트에서 생성(alert로 메세지 띄우기)
{domain.com}/login : ID + PW로 검증
{domain.com}/myborad : 페이지를 구역으로 나눔. 맨 위에는 {Username}' Documents로 제목. 나머지는 블록으로 나눠서 Add Document 버튼(존재하는 문서의 마지막 블록의 다음 블록에만 추가 버튼 1개)을 눌러 문서를 업로드. 업로드 후 본인 개인키로 전자서명. 공개키로 암호화. Document가 생성되면 hover됐을 때 invite User 버튼(+ 모양)과 User list 버튼이 나타남(문서 모양). Invite User를 통해 원하는 유저(ex : Alice)를 초대하면 공개키로 문서의 서명을 검증하고 E2EE를 통해 Alice's Document에 문서가 복호화(업로드 한 user가 본인 개인키로 복호화)되어 전송됨. Delete User 버튼(- 모양)도 존재한다. Delete를 하면 Alice's Document에서 문서가 삭제된다. 즉, User는 본인의 문서와 함께 남에게 invite된 문서가 /myboard에 보이는 것.
{domain.com}/dashboard : 모든 사람의 문서가 나타난다. 문서의 제목과 개요를 볼 수 있으며(/myboard 처럼 블록으로 구성) 원하면 invite 요청을 보낼 수 있는 버튼(사람 모양)

구현 수칙 : 
'URL을 통해 접근불가의 문서에 접근하는 행위' 차단 필요. 
온라인 문서 viewer는 지원되지 않으며, 복호화 수 전달된 문서는 오직 다운로드를 통해야 함. 

자, 이제 구현해봐.