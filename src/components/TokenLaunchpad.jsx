import {
  createInitializeMintInstruction,
  TOKEN_2022_PROGRAM_ID,
  getMintLen,
  ExtensionType,
  TYPE_SIZE,
  LENGTH_SIZE,
  createInitializeMetadataPointerInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  createMintToInstruction,
} from "@solana/spl-token";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { Keypair, Transaction, SystemProgram } from "@solana/web3.js";
import { createInitializeInstruction, pack } from "@solana/spl-token-metadata";

export function TokenLaunchpad() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [supply, setSupply] = useState("");
  const { connected, sendTransaction, publicKey } = useWallet();
  const { connection } = useConnection();

  const handleMint = async () => {
    try {
      if (!connected) {
        alert("not connected to the wallet!");
        return null;
      }
       if (!name || !symbol || !supply || supply <= 0) {
        alert("Please fill in all required fields with valid values");
        return;
      }
      /**
       * @notice generated the keypair and get the length
       */
      let mintKey = Keypair.generate();
      const metadata = {
        mint: mintKey.publicKey,
        name: name,
        symbol: symbol,
        uri: imageUrl,
        additionalMetadata: [],
      };
      const mintLen = getMintLen([ExtensionType.MetadataPointer]);
      const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
      const totalSpace = mintLen + metadataLen;
      const lamports = await connection.getMinimumBalanceForRentExemption(
        totalSpace
      );
      /**
       * @description creating the associated token account
       */

      let associatedTokenAccount = getAssociatedTokenAddressSync(
        mintKey.publicKey,
        publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      
      const createAccountInstruction = SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKey.publicKey,
        lamports: lamports,
        space: mintLen,
        programId: TOKEN_2022_PROGRAM_ID,
      });

      const initateMetadataPointerInstruction =
        createInitializeMetadataPointerInstruction(
          mintKey.publicKey,
          publicKey,
          mintKey.publicKey,
          TOKEN_2022_PROGRAM_ID
        );

      const initializeMintInstruction = createInitializeMintInstruction(
        mintKey.publicKey,
        6,
        publicKey,
        publicKey,
        TOKEN_2022_PROGRAM_ID
      );

      const initializeMetadata = createInitializeInstruction({
        programId: TOKEN_2022_PROGRAM_ID,
        mint: mintKey.publicKey,
        metadata: mintKey.publicKey,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
        mintAuthority: publicKey,
        updateAuthority: publicKey,
      });

      const initializeAssociatedTokenInstruction =
        createAssociatedTokenAccountInstruction(
          publicKey,
          associatedTokenAccount,
          publicKey,
          mintKey.publicKey,
          TOKEN_2022_PROGRAM_ID
        );
      const supplyAmount = BigInt(Math.floor(Number(supply) * Math.pow(10, 6)));
      const mintToInstruction = createMintToInstruction(
        mintKey.publicKey,
        associatedTokenAccount,
        publicKey,
        supplyAmount,
        [],
        TOKEN_2022_PROGRAM_ID
      );

      const transaction = new Transaction().add(
        createAccountInstruction,
        initateMetadataPointerInstruction,
        initializeMintInstruction,
        initializeMetadata,
        initializeAssociatedTokenInstruction,
        mintToInstruction
      );

      transaction.feePayer = publicKey;
      const {  blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash
      transaction.partialSign(mintKey);

      await sendTransaction(transaction, connection);
      console.log("token minted successfully ", mintKey.publicKey.toBase58());
    } catch (error) {
      console.log("error while pressing : ", error);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <h1>Solana Token Launchpad</h1>
      <input
        className="inputText"
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <br />
      <input
        className="inputText"
        type="text"
        placeholder="Symbol"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />
      <br />
      <input
        className="inputText"
        type="text"
        placeholder="Image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />
      <br />
      <input
        className="inputText"
        type="number"
        placeholder="Initial Supply"
        value={supply}
        onChange={(e) => setSupply(e.target.value)}
      />
      <br />
      <button className="btn" onClick={handleMint}>
        Create a token
      </button>
    </div>
  );
}
