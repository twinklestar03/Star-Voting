//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "contracts/interfaces/IStarVotingVerifier.sol";

/// @title StarVoting verifier contract.
/// @notice Derived @semaphore-protocol SemaphoreVerifier.sol
/// @dev This contract allows you to verify whether a Semaphore proof is correct.
/// It is a modified version of the Groth16 verifier template of SnarkJS
/// (https://github.com/iden3/snarkjs) adapted to Semaphore. The Pairing library
/// is external.
contract StarVotingVerifier is IStarVotingVerifier {
    using Pairing for *;

    // prettier-ignore
    // solhint-disable-next-line
    uint256[2][7][17]  VK_POINTS = [[[13406811599156507528361773763681356312643537981039994686313383243831956396116,16243966861079634958125511652590761846958471358623040426599000904006426210032],[11781596534582143578120404722739278517564025497573071755253972265891888117374,15688083679237922164673518758181461582601853873216319711156397437601833996222],[1964404930528116823793003656764176108669615750422202377358993070935069307720,2137714996673694828207437580381836490878070731768805974506391024595988817424],[19568893707760843340848992184233194433177372925415116053368211122719346671126,11639469568629189918046964192305250472192697612201524135560178632824282818614],[5317268879687484957437879782519918549127939892210247573193613900261494313825,528174394975085006443543773707702838726735933116136102590448357278717993744],[14865918005176722116473730206622066845866539143554731094374354951675249722731,3197770568483953664363740385883457803041685902965668289308665954510373380344],[6863358721495494421022713667808247652425178970453300712435830652679038918987,15025816433373311798308762709072064417001390853103872064614174594927359131281]],[[15629200772768268814959330350023920183087521275477047626405113853190187031523,13589689305661231568162336263197960570915890299814486885851912452076929115480],[11464919285924930973853174493551975632739604254498590354200272115844983493029,16004221700357242255845535848024178544616388017965468694776181247983831995562],[17789438292552571310739605737896030466581277887660997531707911256058650850910,4112657509505371631825493224748310061184972897405589115208158208294581472016],[3322052920119834475842380240689494113984887785733316517680891208549118967155,381029395779795399840019487059126246243641886087320875571067736504031557148],[8777645223617381095463415690983421308854368583891690388850387317049320450400,11923582117369144413749726090967341613266070909169947059497952692052020331958],[15493263571528401950994933073246603557158047091963487223668240334879173885581,6315532173951617115856055775098532808695228294437279844344466163873167020700],[3481637421055377106140197938175958155334313900824697193932986771017625492245,20088416136090515091300914661950097694450984520235647990572441134215240947932]],[[9218320951536642499143228327011901814587826948504871816273184688188019956292,19717684456458906358368865507225121991585492363133107109865920739019288468011],[16717590750910963405756115910371408378114896008824240863060392362901176601412,18221695645112467945186983098720611586049108689347006136423489099202471884089],[4691595252082380256698158158199364410440273386659834000993210659508747323919,9205801980459323513061837717352821162780471027241700646145937351740096374660],[16150531426263112884093068164597994126623437929929609532055221646496813246000,20245743178241899668170758952526381872637304119026868520579207157118516761827],[6063536446992770713985314309889717594240410784717230886576072989709763902848,18258781411255795973918859665416013869184055573057512603788635470145328981347],[10109932964756104512054045207253535333686585863745296080906925765480296575285,4174640428253153601540284363759502713687021920150940723252842152556151210349],[18049428534741480832385046397049175120355008065781483226058177421025493210952,591730261265040164434889324846001338201068482543108348317417391345612814922]],[[3995128789564535587814512245259203300137618476815456454931286633947953135662,15953239752392927777442331623182226063776310198012173504208557434319753428770],[20957319343912866335583737646657534123362052690050674068142580221965936605075,2523786679709693946058523307330825034772478122295850507521258983130425334580],[9877211178693075145402462781884120278654771727348087433632224794894486095150,19972682062587174829535281061580296764150591339640180868104711395548066529340],[6324578424031095537345184040149690238371517387586958921377481904541316423724,15513931720576048544404512239839508014664224085062729779520992909505663748296],[11371337652479737143800707796204655130812036287859296372695832558127430723628,11757275188600040111649009832378343123994225623498773406233261322165903848967],[13282496583564708104981015168203451877588903263486398132954741568835583461335,1746144324840370907926720490289700342734912534857331743685374514401176014195],[7993952462467372951144011615584426050192046712674662254138390197508963352374,5156942148925224345709309361345680948125600198010285179548841917923439945819]],[[18976133691706015337908381757202123182841901611067930614519324084182946094218,1382518990777992893805140303684642328066746531257780279226677247567004248173],[6627710380771660558660627878547223719795356903257079198333641681330388499309,21806956747910197517744499423107239699428979652113081469385876768212706694581],[19918517214839406678907482305035208173510172567546071380302965459737278553528,7151186077716310064777520690144511885696297127165278362082219441732663131220],[690581125971423619528508316402701520070153774868732534279095503611995849608,21271996888576045810415843612869789314680408477068973024786458305950370465558],[16461282535702132833442937829027913110152135149151199860671943445720775371319,2814052162479976678403678512565563275428791320557060777323643795017729081887],[4319780315499060392574138782191013129592543766464046592208884866569377437627,13920930439395002698339449999482247728129484070642079851312682993555105218086],[3554830803181375418665292545416227334138838284686406179598687755626325482686,5951609174746846070367113593675211691311013364421437923470787371738135276998]],[[3811592683283527904145155808200366192489850711742363953668998371801696238057,9032545080831535702239063467087720597970266046938395860207839433937324718536],[16308433125974933290258540904373317426123214107276055539769464205982500660715,12429982191499850873612518410809641163252887523090441166572590809691267943605],[9494885690931955877467315318223108618392113101843890678090902614660136056680,11783514256715757384821021009301806722951917744219075907912683963173706887379],[7562082660623781416745328104576133910743071878837764423695105915778139873834,17954307004260053757579194018551114133664721761483240877658498973152950708099],[19338184851116432029108109461622579541195083625346674255186169347975445785058,38361206266360048012365562393026952048730052530888439195454086987795985927],[21178537742782571863590222710872928190886000600239072595684369348717288330049,9786438258541172244884631831247223050494423968411444302812755467521949734320],[11330504221972341797183339350494223413034293674225690456356444509688810101433,1490009915387901405464437253469086864085891770312035292355706249426866485365]],[[9485639152672984144988597737758037391807993615552051606205480347442429414340,17626503110323089701269363177710295379967225765713250625279671011873619640598],[12391874700409435648975069978280047983726144854114915177376036190441913967689,18953587685067712486092665232725058638563458484886448540567142557894080640927],[21791720972262589799021600767292883644106575897307484548888696814333235336885,11092962469758788187888592619035811117815082357439060720677582048880121542623],[9418924955930663972575130074928583215922927562059194231976193350658171304436,16113558481826020406162261319744796072664750077095575593106901121115073101408],[20054934960262983176880675919444457578562219675808407582143519621873973120773,14877415271301547911435683263206245199959943680225555496786470669330176961657],[4215199263810110748751715719957184804379752373072771007598572158043965517488,5225943468606602818132879686778547605180105897615251160509064537462109826521],[6250242626034734280813142093008675407723196706248829741247204621913994561803,1472231555266678689888727724824566171966416459791722465278225775922487343641]],[[9830856103389248449121962275587399130605902703453384856543071762984116567573,11408965575174993375815840422438995549652812400401163392501956884932167624437],[11814906841949499037550820576929552248172160643991870665022770052632331265834,19969543376625663966419118899515353499678204573709836615846115182224340858492],[3047486363455933831148688762823238723024952519326207356549121929667745957778,20241836359289449005887237560564358543646542598344362915541027571505243817211],[5965631918800530319167124148627450454569264331058008407732200168631989208657,20463557477532480934514091877628554948892025887087712764683631108388998871350],[16605042322692983282732511249912403956057999815658038166796858627082222971215,12219061498275616585164456833410962809536084885494309093787669879221959361956],[1548998572074037722622224303222294716243074837074272552644853986075252666508,10393312002885367652301897874262367916506364670364584602554176742602334134772],[16180907689593358346406392015123900260925622357393826746385511046141256905390,12267326749885120640972074479210537480053065569337817484467225562817467244765]],[[15035335306919942325459417688135340085377315274625768597233474641923619728582,10090041889587324002759549286390619541526396451963494627957072069124011137562],[21342049717074059749518233491526445388158772701642182532370641230478027030319,10507786999799841055999967456762679569286329319056926475375760604262707147294],[19590996174696909242575628014943555633938195923520472786993379268302478708283,2673753072556442230312995111304911178679525806396134504594492458566941824354],[13411253172375451489380472831999887223592471057462692619008484995624281735092,17181767455563581254432161119660408482332423481128600038352147258951772423229],[19138864631164378176055647711995352935065134904103255748190268290992108588628,14282526277736365863821375748687709839392307698935143595732632710176778519757],[20183773658676161990469276414858234178608794783112866811307579993999118293429,5223464433544489066271184294750886227362580875255044558831927430970236355539],[12333466991139269670298178539679773509487545471126920233507132846828588847444,3787586478923104354547687861486563468235879611952775292288436085429794222238]],[[15718373132479769904443326381037437528372212185108294117696143473979328398658,43456740675249348549891878341522275183186932745162972528932808393415299552],[11236864934894600819960883124570686936554376109344998527334431594565774237827,4289247401578837038775845192875793775418122783738936298355403103074020081838],[18580370382199518848261939652153768394883698461842792002922164533882262019935,20516185953882700254387267244708111605796661864845495645678049276372075842359],[20041291712709610738573661974551517833120775539593003477018637287434210072702,6326630253906616820412999166182553773360987412889775567442543181359104720511],[13268971611130152315428629919012388924225656285593904211561391821918930327614,9247437189452353488017802041158840512956111558640958728149597697508914590433],[6267384495557139339708615182113725421733376438932580472141549274050146739549,1832264154031452148715318442722960696977572389206897240030908464579133134237],[16650684165487873559901140599157559153018449083939294496255590830891994564285,14140282729498011406186082176268025578697081678243955538935501306868500498994]],[[1723458149089715907994189658689343304709709060535625667210252753337752162173,4023016874169005249382064394379671330447496454371261692205411970999350949293],[7651670126664625790835334090273463062538865895183205964669372719235003083565,17710652158212212080502343565075513548898593397103675832636832371532093744857],[4247947150009812467217672970806328247513830308400387953244764907353849211641,14500381439127180474801393438175928191199696177607750163263715436006533630877],[21213779524495874664157797605662894019112036728653622806607467354233012380232,1429370857470083395421401524518861545167550347090873730934256398864585069083],[12465277751642747637430517396067173985821959773399832969105187923427872239200,4377704428607835904642653580543541241155601291484645500691968624389522190030],[11283027832501128633761619552392013253304972822086786857121687098087331014745,21463394238922953607096052056881931791797740737164052798044623278557203313720],[19687293493101130967741578773742597470558958652351513582962108464055656171331,4445165696525061401582979300506082669540223774145877762689724631935313716632]],[[745924679191739894055143748466112994378439645681039136007774787076115375124,13132169670125192016391258838554965176628317453468870968867717287446623320643],[2126777833939378028304266129616145667925849332481755567268747182629795296580,20909608709868730010029182074820840312550443752829480953667886902663547957991],[3388767735894417381503201756905214431625081913405504580464345986403824999889,21014112837214011009096825602791072748195337199912773858499588477762724153070],[10521317016331497094903116740581271122844131442882845700567581775404872949272,13201921794561774338466680421903602920184688290946713194187958007088351657367],[16170260722059932609965743383032703380650557609693540121262881902248073364496,6004983491336500911294872035126141746032033211872472427212274143945425740617],[10275615677574391293596971122111363003313434841806630200532546038183081960924,5955568702561336410725734958627459212680756023420452791680213386065159525989],[19059081014385850734732058652137664919364805650872154944590269874395511868415,19202365837673729366500417038229950532560250566916189579621883380623278182155]],[[4553625243522856553165922942982108474187282402890756796515747778282922584601,16835654219229187428071649241190746119082269636345872682107941472241044260584],[3272293478534046729728233267765357195255129499603632413158978822084188871854,873742823867191038535544062852920538566418819521732785500614249239215175476],[7856986171681248404396064225772749784181602218562773063185003409958949630985,11707218736744382138692483591389641607570557654489363179025201039696228471230],[2902255937308264958973169948617099471543255757887963647238093192858290079050,4092153880227661899721872164083575597602963673456107552146583620177664115673],[18380478859138320895837407377103009470968863533040661874531861881638854174636,14502773952184441371657781525836310753176308880224816843041318743809785835984],[2781117248053224106149213822307598926495461873135153638774638501111353469325,3500056595279027698683405880585654897391289317486204483344715855049598477604],[8880120765926282932795149634761705738498809569874317407549203808931092257005,19080036326648068547894941015038877788526324720587349784852594495705578761000]],[[7252337675475138150830402909353772156046809729627064992143762325769537840623,7601443214415704135008588588192028557655441716696726549510699770097979655628],[436607343827794507835462908831699962173244647704538949914686722631806931932,18500126298578278987997086114400065402270866280547473913420536595663876273004],[18427701611614193839908361166447988195308352665132182219164437649866377475111,5299493942596042045861137432338955179078182570752746487573709678936617478454],[4188155714164125069834512529839479682516489319499446390214266838952761728656,2720966082507704094346897998659841489771837229143573083003847010258396944787],[13256461570028177373135283778770729308216900804505379897951455548375840027026,10722074030307391322177899534114921764931623271723882054692012663305322382747],[9824147497244652955949696442395586567974424828238608972020527958186701134273,15755269950882650791869946186461432242513999576056199368058858215068920022191],[21172488506061181949536573476893375313339715931330476837156243346077173297265,13892434487977776248366965108031841947713544939953824768291380177301871559945]],[[10202326166286888893675634318107715186834588694714750762952081034135561546271,15028154694713144242204861571552635520290993855826554325002991692907421516918],[18486039841380105976272577521609866666900576498507352937328726490052296469859,12766289885372833812620582632847872978085960777075662988932200910695848591357],[1452272927738590248356371174422184656932731110936062990115610832462181634644,3608050114233210789542189629343107890943266759827387991788718454179833288695],[14798240452388909327945424685903532333765637883272751382037716636327236955001,10773894897711848209682368488916121016695006898681985691467605219098835500201],[17204267933132009093604099819536245144503489322639121825381131096467570698650,7704298975420304156332734115679983371345754866278811368869074990486717531131],[8060465662017324080560848316478407038163145149983639907596180500095598669247,20475082166427284188002500222093571716651248980245637602667562336751029856573],[7457566682692308112726332096733260585025339741083447785327706250123165087868,11904519443874922292602150685069370036383697877657723976244907400392778002614]],[[14930624777162656776068112402283260602512252179767747308433194885322661150422,13682963731073238132274278610660469286329368216526659590944079211949686450402],[18705481657148807016785305378773304476425591636333098330324049960258682574070,21315724107376627085778492378001676935454590984229146391746301404292016287653],[12628427235010608529869146871556870477182704310235373946877240509680742038961,15093298104438768585559335868663959710321348106117735180051519837845319121254],[6593907467779318957599440584793099005109789224774644007604434924706249001015,18549596630007199540674697114946251030815675677713256327810772799104711621483],[6271101737045248834759003849256661059806617144229427987717476992610974162336,355748132218964841305454070022507122319085542484477110563322753565651576458],[2116139772133141967317791473319540620104888687412078412336248003979594158546,4004400204967325849492155713520296687406035356901102254880522534085890616486],[4206647028595764233995379982714022410660284578620723510907006350595207905228,19380634286337609988098517090003334645113675227742745065381519159322795845003]],[[12315240965742683516581565369496371929586281338862761742109651525191835544242,18994803742708336446369128568423705404354655742604689352630273180469431952708],[18019403342409608922812569436317484250134945386869657285229378095251425778096,12707009780301102830224094192984906206920666691015255692741008594808694787917],[2592407181901686208061988776764501828311271519595797153264758207470081204331,11847594161160074962679125411562687287595382335410213641115001866587988494499],[3346927026869562921166545684451290646273836362895645367665514203662899621366,15758185693543979820528128025093553492246135914029575732836221618882836493143],[20528686657810499188368147206002308531447185877994439397529705707372170337045,18025396678079701612906003769476076600196287001844168390936182972248852818155],[9799815250059685769827017947834627563597884023490186073806184882963949644596,4998495094322372762314630336611134866447406022687118703953312157819349892603],[16176535527670849161173306151058200762642157343823553073439957507563856439772,21877331533292960470552563236986670222564955589137303622102707801351340670855]]];

    /// @dev See {ISemaphoreVerifier-verifyProof}.
    function verifyProof(
        uint256 merkleTreeRoot,
        uint256 nullifierHash,
        uint256 signal,
        uint256 externalNullifier,
        uint256[8] calldata proof,
        uint256 merkleTreeDepth
    ) external view override {
        signal = _hash(signal);
        externalNullifier = _hash(externalNullifier);

        Proof memory p;

        p.A = Pairing.G1Point(proof[0], proof[1]);
        p.B = Pairing.G2Point([proof[2], proof[3]], [proof[4], proof[5]]);
        p.C = Pairing.G1Point(proof[6], proof[7]);

        VerificationKey memory vk = _getVerificationKey(merkleTreeDepth - 16);

        Pairing.G1Point memory vk_x = vk.IC[0];

        vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[1], merkleTreeRoot));
        vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[2], nullifierHash));
        vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[3], signal));
        vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[4], externalNullifier));

        Pairing.G1Point[] memory p1 = new Pairing.G1Point[](4);
        Pairing.G2Point[] memory p2 = new Pairing.G2Point[](4);

        p1[0] = Pairing.negate(p.A);
        p2[0] = p.B;
        p1[1] = vk.alfa1;
        p2[1] = vk.beta2;
        p1[2] = vk_x;
        p2[2] = vk.gamma2;
        p1[3] = p.C;
        p2[3] = vk.delta2;

        Pairing.pairingCheck(p1, p2);
    }

    /// @dev We overload the verifyProof function to support the signalArray parameter.
    function verifyProof(
        uint256 merkleTreeRoot,
        uint256 nullifierHash,
        uint256[13] calldata signalArray,
        uint256 externalNullifier,
        uint256[8] calldata proof,
        uint256 merkleTreeDepth
    ) external view override {
        uint256 signal;
        signal = _hash_array(signalArray);
        externalNullifier = _hash(externalNullifier);

        Proof memory p;

        p.A = Pairing.G1Point(proof[0], proof[1]);
        p.B = Pairing.G2Point([proof[2], proof[3]], [proof[4], proof[5]]);
        p.C = Pairing.G1Point(proof[6], proof[7]);

        VerificationKey memory vk = _getVerificationKey(merkleTreeDepth - 16);

        Pairing.G1Point memory vk_x = vk.IC[0];

        vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[1], merkleTreeRoot));
        vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[2], nullifierHash));
        vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[3], signal));
        vk_x = Pairing.addition(vk_x, Pairing.scalar_mul(vk.IC[4], externalNullifier));

        Pairing.G1Point[] memory p1 = new Pairing.G1Point[](4);
        Pairing.G2Point[] memory p2 = new Pairing.G2Point[](4);

        p1[0] = Pairing.negate(p.A);
        p2[0] = p.B;
        p1[1] = vk.alfa1;
        p2[1] = vk.beta2;
        p1[2] = vk_x;
        p2[2] = vk.gamma2;
        p1[3] = p.C;
        p2[3] = vk.delta2;

        Pairing.pairingCheck(p1, p2);
    }

    /// @dev Creates the verification key for a specific Merkle tree depth.
    /// @param vkPointsIndex: Index of the verification key points.
    /// @return Verification key.
    function _getVerificationKey(uint256 vkPointsIndex) private view returns (VerificationKey memory) {
        VerificationKey memory vk;

        vk.alfa1 = Pairing.G1Point(
            20491192805390485299153009773594534940189261866228447918068658471970481763042,
            9383485363053290200918347156157836566562967994039712273449902621266178545958
        );

        vk.beta2 = Pairing.G2Point(
            [
                4252822878758300859123897981450591353533073413197771768651442665752259397132,
                6375614351688725206403948262868962793625744043794305715222011528459656738731
            ],
            [
                21847035105528745403288232691147584728191162732299865338377159692350059136679,
                10505242626370262277552901082094356697409835680220590971873171140371331206856
            ]
        );

        vk.gamma2 = Pairing.G2Point(
            [
                11559732032986387107991004021392285783925812861821192530917403151452391805634,
                10857046999023057135944570762232829481370756359578518086990519993285655852781
            ],
            [
                4082367875863433681332203403145435568316851327593401208105741076214120093531,
                8495653923123431417604973247489272438418190587263600148770280649306958101930
            ]
        );

        vk.delta2 = Pairing.G2Point(VK_POINTS[vkPointsIndex][0], VK_POINTS[vkPointsIndex][1]);

        vk.IC = new Pairing.G1Point[](5);

        vk.IC[0] = Pairing.G1Point(VK_POINTS[vkPointsIndex][2][0], VK_POINTS[vkPointsIndex][2][1]);
        vk.IC[1] = Pairing.G1Point(VK_POINTS[vkPointsIndex][3][0], VK_POINTS[vkPointsIndex][3][1]);
        vk.IC[2] = Pairing.G1Point(VK_POINTS[vkPointsIndex][4][0], VK_POINTS[vkPointsIndex][4][1]);
        vk.IC[3] = Pairing.G1Point(VK_POINTS[vkPointsIndex][5][0], VK_POINTS[vkPointsIndex][5][1]);
        vk.IC[4] = Pairing.G1Point(VK_POINTS[vkPointsIndex][6][0], VK_POINTS[vkPointsIndex][6][1]);

        return vk;
    }

    /// @dev Creates a keccak256 hash of a message compatible with the SNARK scalar modulus.
    /// @param message: Message to be hashed.
    /// @return Message digest.
    function _hash(uint256 message) private pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(message))) >> 8;
    }

    /// @dev Creates a keccak256 hash of a message compatible with the SNARK scalar modulus.
    /// @param message: Signal array to be hashed.
    /// @return Message digest.
    function _hash_array(uint256[13] calldata message) private pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(message))) >> 8;
    }
}
