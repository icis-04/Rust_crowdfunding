
import './App.css';
import idl from './idl.json';
import {Connection, PublicKey, clusterApiUrl} from "@solana/web3.js";
import { Program, AnchorProvider, web3, utils, BN } from '@project-serum/anchor';
import {useEffect, useState} from 'react'
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey';
import { Buffer } from "buffer";
import { Toaster } from 'react-hot-toast';
import toast from "react-hot-toast";


class Campaign {
  constructor(properties) {
      Object.keys(properties).forEach((key) => {
          this[key] = properties[key];
      });
  }
  static schema = new Map([[Campaign,
      {
          kind: 'struct',
          fields: [
              ['admin', [32]],
              ['name', 'string'],
              ['description', 'string'],
              ['amount_donated', 'u64']]
      }]]);
}

const styles = {
  wrapper: `bg-[#212121] text-white flex flex-col p-[1.4rem] h-[20rem] w-[26rem] rounded-[1rem]`,
  walletConnectWrapper: `flex flex-col justify-center items-center h-screen w-screen bg-[#3b3d42] `,
  title: `text-2xl font-bold mb-[2.4rem]`,
  description: `text-sm`,
  input: `w-full h-[2.4rem] rounded-[0.5rem] p-[1rem] my-[2rem] text-[#fff] outline-none border-none`,
  button: `rounded-[0.5rem] border border-gray-100 bg-transparent px-8 py-3 font-semibold text-gray-100 transition-all hover:bg-gray-100 hover:text-[#1d1d1d]`,
}

window.Buffer = Buffer;

const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
};

const { SystemProgram } = web3; 


const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);  //Used to hold the wallet address
  const [campaigns, setCampaigns] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const getProvider =  () => {
    const connection = new Connection(
      network,
      opts.preflightCommitment
    );
    const provider =  new AnchorProvider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  }
  const checkIfWalletIsConnected = async() => {
    try{
      const {solana} = window;
      if (solana){
        if(solana.isPhantom){
          console.log("Phantom wallet found");
          const response = await solana.connect({onlyIfTrusted: true});// Authorize connection
          console.log(
            "Conected with public key:",
            response.publicKey.toString()
          );
          toast.success("Connected");
          setWalletAddress(response.publicKey.toString());
        }else{
          alert("Solana Wallet not found!, get Phantom Wallet");
        }
      }
    }catch(e){
      console.log(e)
    }

  };

  // Function to connect Wallet:
  const connectWallet = async() =>{
    const {solana} = window;
    if (solana) {
      const response = await solana.connect()
      console.log(
        "Connected with Public Key:",
        response.publicKey.toString()
      );
      setWalletAddress(response.publicKey.toString())
    }
  };

  const getCampaigns = async() => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = getProvider();
    const program = new Program(idl, programID, provider)
    Promise.all((await connection.getProgramAccounts(programID)).map(async campaign => ({
    ...(await program.account.campaign.fetch(campaign.pubkey)),
    pubkey: campaign.pubkey,
  })
  )
  ).then(campaigns => setCampaigns(campaigns));
  };

  async function createCampaign(name, description){
    try{
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const [campaign] = findProgramAddressSync([
        utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
        provider.wallet.publicKey.toBuffer(),
      ],program.programId);
      await program.rpc.create(name, description, {
        accounts:{
          campaign,
          user: provider.wallet.publicKey,
          systemProgram:  SystemProgram.programId,
        }
      });
      console.log("Created a new campaign with Address:", campaign.toString())
      toast.success("Created a new Campaign, Remember you can only create one Campaign");
    }catch(e){
      console.log("Error creating campaign account:",e);
      toast.error("Error creating campaign");
    }
  };
  const donate = async(publicKey) =>{
    try{
      const provider = getProvider()
      const program = new Program(idl,programID, provider)
      
      await  program.rpc.donate(new BN(0.5 * web3.LAMPORTS_PER_SOL),{
        accounts: {
          campaign: publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId, 
        },
      });
      console.log("Donated money to:", publicKey.toString());
      toast.success("Donated to the Campaign")
      getCampaigns();
       // amount is a placeholder
    }catch(e){
       console.error("Error donating to the campaign:", e);
       toast.error("Error donating to the campaign")
    }
  };


  async function handleCreateCampaign() {
    await createCampaign(name, description);
  }

  const withdraw =  async publicKey => {
    try{
      const provider = getProvider()
      const program = new Program(idl,programID, provider);
      
      await  program.rpc.withdraw(new BN(3 * web3.LAMPORTS_PER_SOL),{
        accounts: {
          campaign: publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("Withdrawing some money");
      toast.success("Withdrawing some money");
    }catch(e){
       console.error("Error withdrawing:",e);
       toast.error("Error withdrawing")
    }
  } 

  const renderIfNotConnectedContainer = () => (
    <main>
            <h1>Welcome to IcisFunds</h1>
            <p style={{ textAlign: 'center' }}>
              Click the button below to Connect Wallet:
            </p>
            <p style={{ textAlign: 'center', marginTop: '2.5em' }}>
              <button onClick={connectWallet}>Connect</button>
            </p>
          </main>
  ) 

  const renderConnectedContainer = () => (
    <>
    <header>
    <div className="ui menu black" style={{ 'marginTop': '5px' }}>
    
    </div>
    <div className="ui menu black" style={{ 'marginTop': '5px' }}>
    <button onClick={getCampaigns} className={styles.button}>
        Get all the Campaigns available 
      </button>
    </div>
      </header>
      <br />
      {campaigns.map(campaign => (
        <>
        <div className='project'>
        <p>{campaign.name}</p>
        <p>{campaign.description}</p>
        <p>Campaign ID: {campaign.pubkey.toString()}</p>
        <p>Balance: {(campaign.amountDonated / web3.LAMPORTS_PER_SOL).toString()}</p>
        <br />
        <div className={styles.wrapper}>
        <button onClick={() =>  donate(campaign.pubkey)} className={styles.button}>
          Donate 0.5 Sol
        </button>
        </div>
        <div className="ui menu black" style={{ 'marginTop': '5px' }}>
        <button onClick={() =>  withdraw(campaign.pubkey)} className={styles.button}>
          Withdraw 3 Sol
        </button>
        </div>
        </div>
      
        </>
      ))}
      <br />
        <div>
      <label>
        Name:
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <br />
      <label>
        Description:
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <br />
      <br />
      <button onClick={handleCreateCampaign}>Create Campaign</button>
    </div>
    </>
  ) 



  useEffect(() => {
    const onLoad = async() => {
      await checkIfWalletIsConnected()
    }
    window.addEventListener('load',  onLoad)
    return ()=> window.removeEventListener('load', onLoad);
  }, []);


  return <div className='App'>
    <Toaster
        position="top-center"
        reverseOrder={false}
      />
    {!walletAddress && renderIfNotConnectedContainer()}
    {walletAddress && renderConnectedContainer()}
    </div>

};

export default App;
